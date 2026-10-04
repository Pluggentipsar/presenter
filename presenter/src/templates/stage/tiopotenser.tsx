"use client";

/* eslint-disable @next/next/no-img-element */
import { useCallback, useState, type AnimationEvent, type CSSProperties } from "react";
import { RichLines, seeded } from "./kit";
import { CountUp, Kicker, type FormProps } from "./forms";
import { EXPONENT, SKALA_LEVELS } from "./skala";
import { BryggFilm } from "./bryggfilm";
import { SimCanvas, rng, useMotionLive, useStepClock } from "./sim";
import { createSandWorld } from "./sim-sand";
import { STEGE_VIS } from "./stege-vis";
import { MAX_AGENTS, MAX_FEED, MAX_PARTS, MAX_POSTERS, MAX_RUNGS, MAX_WEEK_ITEMS } from "./stage-forms";
import s from "./stage.module.css";
import o from "./tiopotenser.module.css";

/**
 * Tiopotenserna (Rädda världen med AI, 30 september 2026):
 * flödet, sandlådan, affischväggen, snöbollen, duken och skalstegen. Allt innehåll är fält
 * (stage-forms.ts); färgerna kommer ur temats roller. Affischerna är avbildade
 * filmaffischer: deras genrefärger och typsnitt hör till bilden och står kvar
 * när T byter tema, medan väggen, rubrikerna och det som döljs följer temat.
 * Koordinater på 1600 × 900.
 */

const range = (max: number) => Array.from({ length: max }, (_, i) => i + 1);

/* ------------------------------------------------------------------ flödet */

/** Hur många poster flödet visar direkt (fältet start, standard 1). */
export function feedStart(value: string, items: number): number {
  return Math.max(1, Math.min(items, Math.round(Number(value)) || 1));
}

/**
 * Flödet: en telefon med nyheter eller videor. De första posterna syns direkt
 * (fältet start), varje klick lägger en ny överst och trycker de äldre nedåt.
 * Sist dämpas telefonen och slutraden kommer. En post är antingen en skärmdump
 * (media) eller en rubrik med källa och datum, på originalspråket.
 */
export function Flode({ t, edit, step }: FormProps) {
  const items = range(MAX_FEED).filter(n => t(`head${n}`) || t(`media${n}`));
  const first = feedStart(t("start"), items.length);
  const reveals = items.length - first + 1;
  const shown = Math.min(items.length, first + step);
  const resting = Boolean(t("note")) && step >= reveals;
  return <div className={o.flode} data-resting={resting}>
    <header className={o.flHead}>
      <Kicker t={t} edit={edit} />
      {t("title") && <h2>{edit("title", <RichLines text={t("title")} emphasis={t("emphasis")} />)}</h2>}
    </header>
    <section className={o.phone} aria-label={t("feedTitle") || "Flödet"}>
      <div className={o.phoneBar} aria-hidden="true"><span>09.41</span><i /><span className={o.phoneIcons}><b /><b /><b /></span></div>
      {t("feedTitle") && <p className={o.feedTitle}>{edit("feedTitle")}</p>}
      <ol className={o.feed}>
        {items.map((n, i) => {
          // Den senaste står överst (kolumnen är omvänd); ett nytt kort växer fram och trycker ned de äldre.
          const on = i < shown;
          return <li key={n} className={o.card} data-on={on} data-shot={Boolean(t(`media${n}`)) || undefined} data-tone={t(`tone${n}`) || undefined} aria-hidden={!on}>
            {t(`media${n}`)
              ? <figure className={o.shot}><img src={t(`media${n}`)} alt={t(`alt${n}`)} />
                {(t(`source${n}`) || t(`date${n}`)) && <figcaption>{t(`source${n}`) && edit(`source${n}`)}{t(`date${n}`) && <span>{edit(`date${n}`)}</span>}</figcaption>}</figure>
              : <>
                <p className={o.cardMeta}><span>{edit(`source${n}`)}</span>{t(`date${n}`) && <span>{edit(`date${n}`)}</span>}</p>
                <h3 lang="en">{edit(`head${n}`, <RichLines text={t(`head${n}`)} />)}</h3>
              </>}
          </li>;
        })}
      </ol>
    </section>
    {t("note") && <h2 className={`${o.flNote} ${s.reveal}`} data-on={resting} aria-hidden={!resting}>{edit("note", <RichLines text={t("note")} emphasis={t("emphasis")} />)}</h2>}
  </div>;
}

/* ---------------------------------------------------------------- sandlådan */

/**
 * Sandlådan: agenterna arbetar i en ruta, som ett system (sim-sand.ts; schematiskt, prickarna är
 * inga mätvärden). De går mellan stationer och prövar väggarna. Nästa klick öppnar en lucka i kanten,
 * och de som tar sig ut strömmar mot målet. Sedan fakta medan världen går långsamt, och sist en slutrad.
 */
export function Sandlada({ t, edit, step, still }: FormProps) {
  const total = Math.max(24, Math.min(240, Number(t("count")) || 120));
  const out = Math.max(0, Math.min(total, Number(t("escaped")) || Math.round(total * .4)));
  const facts = range(3).filter(n => t(`fact${n}`));
  const open = step >= 1;
  const factsOn = facts.length > 0 && step >= 2;
  const resting = Boolean(t("note")) && step >= 2 + (facts.length ? 1 : 0);
  const world = useCallback(() => createSandWorld({ total, out }), [total, out]);
  return <div className={o.sand} data-open={open} data-facts={factsOn} data-resting={resting} data-still={still}>
    <header className={o.sdHead}>
      <Kicker t={t} edit={edit} />
      {t("title") && <h2>{edit("title", <RichLines text={t("title")} emphasis={t("emphasis")} />)}</h2>}
    </header>
    <SimCanvas key={`${total}-${out}`} create={world} step={step} still={still} className={o.simLayer} />
    <div className={o.box}>
      {t("boxLabel") && <p className={o.boxLabel}>{edit("boxLabel")}</p>}
      <svg className={o.boxEdge} viewBox="0 0 480 480" aria-hidden="true">
        <path d="M 240 0 H 0 V 480 H 480 V 300" pathLength={1} />
        <path className={o.boxGate} d="M 480 300 V 180" pathLength={1} />
        <path d="M 480 180 V 0 H 240" pathLength={1} />
      </svg>
    </div>
    {t("outLabel") && <p className={o.outLabel} data-on={open} aria-hidden={!open}><i />{edit("outLabel")}</p>}
    {facts.length > 0 && <ol className={o.facts} data-on={factsOn} aria-hidden={!factsOn}>
      {facts.map((n, i) => <li key={n} className={s.reveal} data-on={factsOn} style={{ transitionDelay: factsOn && !still ? `${i * 140}ms` : undefined }}>{edit(`fact${n}`, <RichLines text={t(`fact${n}`)} />)}</li>)}
    </ol>}
    {t("note") && <h2 className={`${o.sdNote} ${s.reveal}`} data-on={resting} aria-hidden={!resting}>{edit("note", <RichLines text={t("note")} emphasis={t("emphasis")} />)}</h2>}
  </div>;
}

/* -------------------------------------------------------- affischväggen */

const GENRES = new Set(["fralsare", "forgorare", "gud", "tjanare", "spegel", "partner"]);

/** Stegen i väggen: 0 väggen, sedan en affisch (och det den döljer) i taget, sist väggen igen. */
function posterPlan(t: FormProps["t"]) {
  const posters = range(MAX_POSTERS).filter(n => t(`name${n}`));
  const plan: { n: number; hides: boolean }[] = [];
  posters.forEach(n => { plan.push({ n, hides: false }); if (t(`hides${n}`)) plan.push({ n, hides: true }); });
  return { posters, plan };
}

/**
 * Censurstreck: varje rad ligger under ett streck i textens färg, som lyfts (krymper åt höger)
 * när raden ska läsas. Raden som börjar med ~ får den mjuka färgen. Strecken följer textens
 * bredd rad för rad (box-decoration-break).
 */
function Redacted({ text }: { text: string }) {
  return <>{text.split("\n").map((raw, i) => {
    const soft = raw.startsWith("~");
    return <span key={i} className={o.redLine} data-soft={soft || undefined} style={{ "--i": i } as CSSProperties}>
      <span>{soft ? raw.replace(/^~\s?/, "") : raw}</span>
    </span>;
  })}</>;
}

/** Affischens namn i genrens typsnitt: långa namn krymper så att raden ryms (--len = längsta raden). */
const longestLine = (text: string) => Math.max(1, ...text.split("\n").map(line => line.replace(/^~\s?/, "").trim().length));

/**
 * Affischväggen: sex berättelser om AI som filmaffischer. Väggen först, sedan
 * kliver en affisch i taget fram och det den döljer kommer på eget klick. Sist
 * står alla på väggen igen och slutraden kommer, och en fråga kan få ett eget
 * klick medan väggen står kvar (bikupan). En ensam affisch står stort i mitten
 * från början och kliver sedan åt sidan.
 */
/**
 * Dragningskraften (visualiseringspasset 1 oktober 2026): när väggen kommer flyger berättelsernas
 * platser (habitat, delade vid ·) och flödets rubriker (pull<n>, delade vid |) in nedifrån och sugs upp
 * av sin affisch. Väggens affischer står i rad: mitt x 205 + i × 238, y 478.
 */
function pullFragments(t: FormProps["t"], posters: number[]) {
  const rand = rng(57);
  const items = posters.flatMap((n, i) => [...t(`pull${n}`).split("|"), ...t(`habitat${n}`).split("·")]
    .map(text => text.trim()).filter(Boolean).map(text => ({ n, i, text, key: rand() })))
    .sort((a, b) => a.key - b.key);
  return items.map((item, k) => {
    const cx = 205 + item.i * 238, cy = 478;
    const side = rand();
    const sx = side < .72 ? 80 + rand() * 1440 : side < .86 ? -220 : 1820;
    const sy = sx < 0 || sx > 1600 ? 660 + rand() * 230 : 960;
    const swing = (rand() < .5 ? -1 : 1) * (150 + rand() * 130);
    const path = `M ${sx.toFixed(0)} ${sy.toFixed(0)} C ${(sx + (rand() - .5) * 320).toFixed(0)} ${(sy - 230 - rand() * 120).toFixed(0)}, ${(cx + swing).toFixed(0)} ${(cy + 190 + rand() * 90).toFixed(0)}, ${cx} ${cy}`;
    return { ...item, path, delay: .35 + k * .12, dur: 1.6 + rand() * .6 };
  });
}

export function Berattelser({ t, edit, step, still }: FormProps) {
  const { posters, plan } = posterPlan(t);
  const live = useMotionLive(still);
  const at = step >= 1 && step <= plan.length ? plan[step - 1] : null;
  const resting = Boolean(t("bottomLine")) && step > plan.length;
  const asking = Boolean(t("question")) && step > plan.length + (t("bottomLine") ? 1 : 0);
  const focus = at?.n ?? 0;
  const order = posters.indexOf(focus);
  const solo = posters.length === 1;
  const pulling = live && step === 0 && !solo;
  const fragments = pulling ? pullFragments(t, posters) : [];
  const hitAt = (n: number) => Math.min(...fragments.filter(f => f.n === n).map(f => f.delay + f.dur), 99);
  return <div className={o.wall} data-focus={focus ? "" : undefined} data-resting={resting || asking} data-asking={asking} data-solo={solo || undefined} data-pulling={pulling || undefined} data-still={still}>
    <header className={o.wallHead} data-dim={Boolean(focus)}>
      <Kicker t={t} edit={edit} />
      {t("title") && <h2>{edit("title", <RichLines text={t("title")} emphasis={t("emphasis")} />)}</h2>}
    </header>
    <ol className={o.posters}>
      {posters.map((n, i) => {
        const genre = GENRES.has(t(`genre${n}`)) ? t(`genre${n}`) : "tjanare";
        const place = !focus ? solo ? "solo" : "wall" : n === focus ? "front" : "row";
        // Raden under den framkallade affischen: de andra i ordning, utan den.
        const rowIndex = i < order ? i : i - 1;
        return <li key={n} className={o.poster} data-genre={genre} data-place={place}
          style={{ "--i": i, "--r": rowIndex, "--len": longestLine(t(`name${n}`)), "--hit": `${hitAt(n).toFixed(2)}s` } as CSSProperties} aria-hidden={Boolean(focus) && n !== focus}>
          <div className={o.posterArt} aria-hidden="true"><i /><i /><i /></div>
          {t(`media${n}`) && <img className={o.posterHero} src={t(`media${n}`)} alt={t(`alt${n}`)} />}
          {/* Affischens finstil: topptext och rollista. Standard är väggens egna rader. */}
          <p className={o.posterTop} aria-hidden={!t(`top${n}`)}>{t(`top${n}`) ? edit(`top${n}`) : "En berättelse om AI"}</p>
          <h3 className={o.posterName} data-mirror={t(`name${n}`).replace(/\n~?/g, " ")}>{edit(`name${n}`, <RichLines text={t(`name${n}`)} />)}</h3>
          <p className={o.posterBill} aria-hidden={!t(`bill${n}`)}>{t(`bill${n}`) ? edit(`bill${n}`) : "AI i huvudrollen"}</p>
        </li>;
      })}
    </ol>
    {pulling && <div className={o.pull} aria-hidden="true">
      {fragments.map((f, k) => <span key={k} data-feed={t(`pull${f.n}`).includes(f.text) || undefined}
        style={{ offsetPath: `path("${f.path}")`, "--delay": `${f.delay.toFixed(2)}s`, "--dur": `${f.dur.toFixed(2)}s` } as CSSProperties}>{f.text}</span>)}
    </div>}
    {/* Eftertexten: berättelsens rad stort, sedan som i en films eftertext etiketten i marginalen
        och innehållet bredvid. Det den döljer står under censurstreck som lyfts på sitt klick. */}
    <section className={o.story} data-on={Boolean(focus)} aria-hidden={!focus}>
      {posters.map((n, i) => <div key={n} className={o.storyText} data-on={n === focus} aria-hidden={n !== focus}>
        <p className={o.storyName}>{posters.length > 1 && <span>{String(i + 1).padStart(2, "0")} / {String(posters.length).padStart(2, "0")}</span>}{t(`name${n}`).replace(/\n~?/g, " ")}</p>
        <p className={o.storyTagline}>{edit(`tagline${n}`, <RichLines text={t(`tagline${n}`)} />)}</p>
        <dl className={o.credits}>
          {t(`habitat${n}`) && <div className={o.creditRow}><dt>Bor i</dt><dd>{edit(`habitat${n}`, <RichLines text={t(`habitat${n}`)} />)}</dd></div>}
          {t(`hides${n}`) && <div className={o.creditRow} data-hides="" data-open={n === focus && Boolean(at?.hides)}>
            <dt>{t("hidesLabel") || "Döljer"}</dt>
            <dd aria-hidden={!(n === focus && at?.hides)}>{edit(`hides${n}`, <Redacted text={t(`hides${n}`)} />)}</dd>
          </div>}
        </dl>
      </div>)}
    </section>
    {t("bottomLine") && <p className={`${o.wallLine} ${s.reveal}`} data-on={resting && !asking} aria-hidden={!resting || asking}>{edit("bottomLine", <RichLines text={t("bottomLine")} emphasis={t("emphasis")} />)}</p>}
    {t("question") && <div className={`${o.wallAsk} ${s.reveal}`} data-on={asking} aria-hidden={!asking}>
      {t("questionLabel") && <p className={s.kicker}>{edit("questionLabel")}</p>}
      <h2>{edit("question", <RichLines text={t("question")} emphasis={t("emphasis")} />)}</h2>
      {t("questionCaption") && <p className={o.wallAskCaption}>{edit("questionCaption", <RichLines text={t("questionCaption")} />)}</p>}
    </div>}
  </div>;
}

/* ------------------------------------------------------------ snöbollen */

/**
 * Snöbollen: den första prototypen är liten. Nästa klick lägger funktion på
 * funktion runt den tills kärnan försvinner i bollen. Sist dras en ring tätt
 * kring kärnan, funktionerna glider undan och slutraden kommer.
 */
export function Snoboll({ t, edit, step, still }: FormProps) {
  const features = t("features").split("|").map(word => word.trim()).filter(Boolean).slice(0, 16);
  const rolling = features.length > 0 && step >= 1;
  const ringed = Boolean(t("final")) && step >= 1 + (features.length ? 1 : 0);
  // En spiral runt skissen: varje ny funktion lite längre ut och ett gyllene snitt vidare. Linjen går
  // från etikettens kant till figurens ram: skissen och bildtexten, 95 åt sidorna, 165 upp och 250 ned.
  const spots = features.map((feature, i) => {
    const angle = i * 2.39996;
    const radius = 230 + i * 11 + seeded(i + 5) * 24;
    const fx = Math.cos(angle) * radius;
    let fy = Math.sin(angle) * radius * .72;
    // En etikett som skulle hamna över skissen eller bildtexten (som slutar 240 under mitten) flyttas
    // förbi dem i höjdled. Halva etikettbredden uppskattas ur antalet tecken.
    if (Math.abs(fx) - (feature.length * 6.5 + 14) < 100) fy = fy > 0 ? Math.max(fy, 300 + (i % 2) * 36) : Math.min(fy, -205 - (i % 2) * 36);
    const length = Math.hypot(fx, fy), ux = fx / length, uy = fy / length;
    const edge = Math.min(84 / Math.max(.01, Math.abs(ux)), 20 / Math.max(.01, Math.abs(uy)));
    const k = Math.min(95 / Math.max(.01, Math.abs(fx)), (fy > 0 ? 250 : 165) / Math.max(.01, Math.abs(fy)));
    return { fx: fx.toFixed(1), fy: fy.toFixed(1), x1: (fx - ux * (edge + 8)).toFixed(1), y1: (fy - uy * (edge + 8)).toFixed(1), x2: (fx * k).toFixed(1), y2: (fy * k).toFixed(1) };
  });
  // Bollens storlek: längst ut liggande funktion plus marginal.
  const ballRadius = Math.round(Math.max(260, ...spots.map(spot => Math.hypot(Number(spot.fx), Number(spot.fy) / .76))) + 70);
  return <div className={o.snow} data-rolling={rolling} data-ringed={ringed} data-still={still}>
    <header className={o.snHead}>
      <Kicker t={t} edit={edit} />
      <h2 className={o.snTitle} data-on={!rolling || ringed}>{edit("title", <RichLines text={t("title")} />)}</h2>
      {t("title2") && <h2 className={o.snTitle2} data-on={rolling && !ringed} aria-hidden={!rolling || ringed}>{edit("title2", <RichLines text={t("title2")} />)}</h2>}
    </header>
    {/* Prototypen är en skiss av en skärm. Funktionerna hänger på den med tunna linjer, tills
        skissen försvinner i trådarna. Att ringa in är att beskära: tryckets beskärningsmärken drar
        ihop sig kring kärnan och allt annat tonar bort. */}
    <div className={o.ball}>
      <svg className={o.leaders} viewBox="-600 -440 1200 880" aria-hidden="true">
        {/* Snöbollen: en streckad ellips som växer medan funktionerna fastnar (visualiseringspasset). */}
        <ellipse className={o.snowBall} cx="0" cy="0" rx={ballRadius} ry={(ballRadius * .76).toFixed(1)} style={{ "--n": features.length } as CSSProperties} />
        {spots.map((spot, i) => <line key={i} x1={spot.x1} y1={spot.y1} x2={spot.x2} y2={spot.y2} pathLength={1} style={{ "--i": i } as CSSProperties} />)}
      </svg>
      <ul className={o.features} aria-label={features.join(", ")}>
        {features.map((feature, i) => <li key={i} style={{ "--fx": `${spots[i].fx}px`, "--fy": `${spots[i].fy}px`, "--i": i } as CSSProperties}>{feature}</li>)}
      </ul>
      <figure className={o.core}>
        <svg className={o.wire} viewBox="0 0 170 300" aria-hidden="true">
          <rect x="1.5" y="1.5" width="167" height="297" rx="16" />
          <path d="M 70 14 H 100" />
          <rect className={o.wireFill} x="16" y="34" width="138" height="16" rx="2" />
          <rect x="16" y="62" width="138" height="96" rx="2" />
          <path d="M 16 62 L 154 158 M 154 62 L 16 158" />
          <path className={o.wireText} d="M 16 178 H 146 M 16 194 H 128 M 16 210 H 138" />
          <rect className={o.wireButton} x="16" y="240" width="138" height="34" rx="17" />
        </svg>
        <figcaption>
          <strong>{edit("core", <RichLines text={t("core")} />)}</strong>
          {t("coreLabel") && <small>{edit("coreLabel")}</small>}
        </figcaption>
      </figure>
      {(["tl", "tr", "bl", "br"] as const).map(corner => <i key={corner} className={o.crop} data-c={corner} aria-hidden="true" />)}
      {t("ring") && <p className={o.ringWord} data-on={ringed} aria-hidden={!ringed}>{edit("ring")}</p>}
    </div>
    {t("final") && <p className={`${o.snFinal} ${s.reveal}`} data-on={ringed} aria-hidden={!ringed}>{edit("final", <RichLines text={t("final")} emphasis={t("emphasis")} />)}</p>}
  </div>;
}

/* ------------------------------------------------------------- skalstegen */

/**
 * Skalstegen: ett exempel per tiopotens. Stegen står till vänster med ett trappsteg
 * per exempel; för varje klick tänds nästa steg, kortet byter exempel och världen
 * zoomar till exemplets nivå (fältet skala per steg). Kommande exempel syns bara
 * som en prick. Sist står hela stegen kvar och slutraden kommer i kortets ställe.
 */
export function Stege({ t, edit, step, still }: FormProps) {
  const rungs = range(MAX_RUNGS).filter(n => t(`name${n}`));
  const resting = Boolean(t("note")) && step >= rungs.length;
  const at = Math.min(step, rungs.length - 1);
  const stateOf = (i: number) => resting ? "all" : i < at ? "past" : i === at ? "current" : "future";
  // Många exempel (nio): stegen blir högre och namnen mindre, så att varje namn ryms på en rad.
  return <div className={o.stege} data-resting={resting} data-still={still} data-many={rungs.length >= 8 || undefined} style={{ "--n": Math.max(1, rungs.length - 1) } as CSSProperties}>
    <div className={o.stScrim} aria-hidden="true" />
    {/* Visualiseringen per exempel (fältet vis<n>, stege-vis.tsx): vind, batar, flod, skanning, karta. */}
    {rungs.map((n, i) => {
      const Vis = STEGE_VIS[t(`vis${n}`)];
      return Vis ? <Vis key={n} n={n} on={!resting && i === at} still={still} t={t} /> : null;
    })}
    <header className={o.stHead}>
      <Kicker t={t} edit={edit} />
      {t("title") && <h2>{edit("title", <RichLines text={t("title")} />)}</h2>}
    </header>
    <ol className={o.rungs} aria-label={rungs.map(n => t(`name${n}`)).join(", ")}>
      {rungs.map((n, i) => <li key={n} data-state={stateOf(i)} style={{ "--i": i } as CSSProperties}>
        <i aria-hidden="true" />
        <span className={o.rungScale}>{t(`scale${n}`)}</span>
        <span className={o.rungName}>{t(`name${n}`)}</span>
      </li>)}
    </ol>
    <section className={o.stCard} data-on={!resting} aria-hidden={resting}>
      {rungs.map((n, i) => <article key={n} data-state={stateOf(i)} aria-hidden={i !== at || resting}>
        {t(`scale${n}`) && <p className={o.stScale}>{edit(`scale${n}`)}</p>}
        <h3>{edit(`name${n}`)}</h3>
        <p className={o.stText}>{edit(`text${n}`, <RichLines text={t(`text${n}`)} />)}</p>
        {t(`source${n}`) && <p className={o.stSource}>{edit(`source${n}`)}</p>}
      </article>)}
    </section>
    {t("note") && <h2 className={`${o.stNote} ${s.reveal}`} data-on={resting} aria-hidden={!resting}>{edit("note", <RichLines text={t("note")} emphasis={t("emphasis")} />)}</h2>}
  </div>;
}

/* ---------------------------------------------------------------- sidorna */

const PART_ROLES = new Set(["alert", "human", "ai", "ink"]);

/** Kolumner i sidrutnätet: så många att alla sidor ryms i rutan och blir så stora som möjligt. */
function sheetColumns(total: number, width = 820, height = 340, gap = 5, ratio = .72) {
  for (let cols = 6; cols < 80; cols++) {
    const w = (width - (cols - 1) * gap) / cols;
    const rows = Math.ceil(total / cols);
    if (rows * (w / ratio) + (rows - 1) * gap <= height) return cols;
  }
  return 80;
}

/** Där bunten ligger innan sidorna delas ut, i arkets koordinater (820 × 340). */
const PILE = { x: 60, y: 90 };

/** Delarnas block i dokumentet: i ordning, med en kort början före första delen och luft mellan delarna. */
function partBlocks(total: number, sizes: number[]) {
  const blocks: { start: number; size: number }[] = [];
  let cursor = Math.round(total * .05);
  let prevEnd = 0;
  for (const raw of sizes) {
    const size = Math.min(raw, total);
    const start = Math.max(prevEnd, Math.min(cursor, total - size));
    prevEnd = start + size;
    cursor = prevEnd + Math.round(total * .1);
    blocks.push({ start, size });
  }
  return blocks;
}

/**
 * Sidorna: ett dokument i proportioner. Först en eller två frågor. Sedan fälls
 * dokumentet ut som ett rutnät av sidor, och delarna lyser upp en per klick,
 * med sitt sidantal stort bredvid och ett citat under. Sidornas ordning är
 * schematisk: delarna ligger som sammanhängande block.
 */
export function Sidor({ t, edit, step, still }: FormProps) {
  const total = Math.max(8, Math.min(600, Math.round(Number(t("pages"))) || 100));
  const asks = ["question", "question2"].filter(key => t(key));
  const parts = range(MAX_PARTS).filter(n => t(`part${n}`) && Number(t(`pages${n}`)) > 0);
  const lit = Math.max(0, Math.min(parts.length, step - asks.length + 1));
  const open = parts.length > 0 && lit > 0;
  const placed = partBlocks(total, parts.map(n => Math.round(Number(t(`pages${n}`)))));
  const blocks = parts.map((n, i) => {
    const role = t(`role${n}`);
    return { n, i, ...placed[i], role: PART_ROLES.has(role) ? role : i === 0 ? "alert" : "ink" };
  });
  const owner = (page: number) => blocks.find(block => page >= block.start && page < block.start + block.size);
  const cols = sheetColumns(total), cell = (820 - (cols - 1) * 5) / cols;
  const last = open && lit === parts.length;
  return <div className={o.sdr} data-open={open} data-still={still}>
    <header className={o.sdrHead}>
      <Kicker t={t} edit={edit} />
      <h2>
        {t("question") && <span className={o.sdrAsk}>{edit("question", <RichLines text={t("question")} />)}</span>}
        {t("question2") && <span className={`${o.sdrAsk} ${s.reveal}`} data-on={step >= 1} aria-hidden={step < 1}>{edit("question2", <RichLines text={t("question2")} emphasis={t("emphasis")} />)}</span>}
      </h2>
    </header>
    <section className={o.sheet} data-on={open} aria-hidden={!open} aria-label={t("docLabel") || `${total} sidor`}>
      <p className={o.sheetLabel}>{t("docLabel") ? edit("docLabel") : `${total} sidor`}</p>
      <ol className={o.pages} style={{ "--cols": cols } as CSSProperties} aria-hidden="true">
        {Array.from({ length: total }, (_, page) => {
          const block = owner(page);
          const on = Boolean(block) && block!.i < lit;
          // Utdelningen (visualiseringspasset): sidan kommer från bunten (--px, --py) till sin plats i rutnätet.
          const x = (page % cols) * (cell + 5), y = Math.floor(page / cols) * (cell / .72 + 5);
          return <li key={page} data-role={block?.role} data-on={on || undefined}
            style={{ "--p": page, "--px": `${(PILE.x - x).toFixed(0)}px`, "--py": `${(PILE.y - y).toFixed(0)}px`, ...(block ? { "--k": page - block.start, "--base": block.i === 0 ? "1.25s" : "0s" } : {}) } as CSSProperties} />;
        })}
      </ol>
    </section>
    <ol className={o.parts} aria-hidden={!open}>
      {blocks.map(block => <li key={block.n} className={s.reveal} data-role={block.role} data-on={block.i < lit} aria-hidden={block.i >= lit}>
        {/* Sidantalet räknas upp i takt med att delens sidor tänds. */}
        <strong>{edit(`pages${block.n}`, <CountUp value={t(`pages${block.n}`)} run={!still && block.i === lit - 1} />)}</strong>
        <span className={o.partName}><small>av {total} sidor</small>{edit(`part${block.n}`)}</span>
      </li>)}
    </ol>
    {blocks.map(block => t(`quote${block.n}`) && <blockquote key={block.n} className={`${o.sdrQuote} ${s.reveal}`} data-role={block.role} data-on={block.i < lit} aria-hidden={block.i >= lit}>
      {edit(`quote${block.n}`, <RichLines text={t(`quote${block.n}`)} emphasis={t("emphasis")} />)}
      {t("quoteSource") && <footer>{edit("quoteSource")}</footer>}
    </blockquote>)}
    {t("after") && <p className={`${o.sdrAfter} ${s.reveal}`} data-on={last} aria-hidden={!last}>{edit("after", <RichLines text={t("after")} />)}</p>}
  </div>;
}

/* ---------------------------------------------------------------- slingan */

/** Stationerna runt ringen: överst, höger, nederst, vänster. */
const LOOP_AT = ["top", "right", "bottom", "left"] as const;
/** Vägen ut: från ringen snett uppåt höger och ut ur bilden. Samma väg för spåret och punkten (CSS offset-path). */
const SLINGA_EXIT = "M 1211 453 C 1310 380, 1440 290, 1660 170";
/** Chattbotens sekvens i sektionens koordinater (500 × 300): frågan till höger, svaret tillbaka. */
const SEQ = { ask: "M 0 128 H 500", answer: "M 500 218 H 0", trip: "M 0 128 H 500 V 218 H 0" };
/** Varvets takt (samma som slSpin i CSS): punkten börjar överst efter 1,3 s och tar 3,4 s per varv. */
const LAP = { start: 1.3, period: 3.4 };
/** Verktygen som agenten anropar vid stationen till höger (1240, 545): webb, kod och filer, ett per varv. */
const TOOLS = [
  { x: 1330, y: 452, icon: "M -9 0 A 9 9 0 1 0 9 0 A 9 9 0 1 0 -9 0 M -9 0 H 9 M 0 -9 C -5 -4 -5 4 0 9 C 5 4 5 -4 0 -9" },
  { x: 1440, y: 452, icon: "M -4 -7 L -10 0 L -4 7 M 4 -7 L 10 0 L 4 7" },
  { x: 1385, y: 628, icon: "M -10 -6 H -3 L -1 -3 H 10 V 8 H -10 Z" },
] as const;

/** Agentens logg fram till tiden t: en rad per station, provet underkänt två varv av tre. */
function agentLog(t: number, stations: number) {
  const lines: { n: number; station: number; test?: boolean }[] = [];
  for (let k = 0; k < 40; k++) for (let i = 0; i < stations; i++) {
    if (LAP.start + k * LAP.period + i * LAP.period / stations > t) return lines;
    lines.push({ n: lines.length + 1, station: i, test: i === 2 ? k % 3 === 2 : undefined });
  }
  return lines;
}

/**
 * Slingan: en chattbot går fram och tillbaka, en agent går varv. Först chattboten
 * (du frågar, den svarar). Sedan agenten: målet och en ring med stationer som en
 * punkt går runt. Sist lämnar punkten ringen och drar ut ur bilden, och slutraden kommer.
 */
export function Slinga({ t, edit, step, still }: FormProps) {
  const loop = range(4).filter(n => t(`loop${n}`));
  const agent = step >= 1;
  const out = Boolean(t("note")) && step >= 2;
  // Loggen räknas fram ur tiden i agentens läge; när den lämnar ramen står tre varv kvar och en röd rad.
  const clock = useStepClock(step, still, 40);
  const threeLaps = LAP.start + 3 * LAP.period - .01;
  const log = agentLog(out || step < 1 || clock === Infinity ? threeLaps : clock, loop.length).slice(-6);
  return <div className={o.sl} data-agent={agent} data-out={out} data-still={still}>
    <header className={o.slHead}>
      <Kicker t={t} edit={edit} />
      {t("title") && <h2>{edit("title", <RichLines text={t("title")} />)}</h2>}
    </header>
    {/* Chattboten som sekvensdiagram: två livslinjer, frågan går dit och svaret kommer tillbaka.
        En punkt gör resan en gång och stannar. Agentens punkt till höger slutar aldrig gå runt. */}
    <section className={o.slBot} aria-label={t("leftLabel") || undefined}>
      {t("leftLabel") && <p className={o.slLabel}>{edit("leftLabel")}</p>}
      <svg className={o.slSeq} viewBox="0 0 500 300" aria-hidden="true">
        <path className={o.slLife} d="M 0.5 50 V 268 M 499.5 50 V 268 M -9 268 H 10 M 490 268 H 509" />
        <path className={o.slSend} d={SEQ.ask} pathLength={1} />
        <path className={o.slSendHead} d="M 484 118 L 500 128 L 484 138" />
        <path className={o.slBack} d={SEQ.answer} pathLength={1} />
        <path className={o.slBackHead} d="M 16 208 L 0 218 L 16 228" />
      </svg>
      <p className={o.slAsk}>{edit("ask", <RichLines text={t("ask")} />)}</p>
      <p className={o.slAnswer}>{edit("answer", <RichLines text={t("answer")} />)}</p>
      <span className={o.slTrip} style={{ offsetPath: `path("${SEQ.trip}")` }} aria-hidden="true" />
    </section>
    <section className={o.slAgent} data-on={agent} aria-hidden={!agent} aria-label={t("rightLabel") || undefined}>
      {t("rightLabel") && <p className={o.slLabel}>{edit("rightLabel")}</p>}
      {/* Målet står i mitten; agenten går varv runt det. Ringens mitt (1080, 545), radie 160. */}
      {t("goal") && <p className={o.slGoal}>{edit("goal", <RichLines text={t("goal")} />)}</p>}
      <svg className={o.slRing} viewBox="0 0 1600 900" aria-hidden="true">
        <circle className={o.slCircle} cx="1080" cy="545" r="160" pathLength={1} />
        {loop.map((n, i) => {
          const a = -Math.PI / 2 + i * Math.PI / 2;
          return <circle key={n} className={o.slStop} cx={(1080 + Math.cos(a) * 160).toFixed(1)} cy={(545 + Math.sin(a) * 160).toFixed(1)} r="10" style={{ "--i": i } as CSSProperties} />;
        })}
        <path className={o.slTrail} d={SLINGA_EXIT} pathLength={1} />
        {/* Verktygsanropen: en stråle från stationen till höger ut till verktyget, ett verktyg per varv. */}
        {loop.length >= 2 && TOOLS.map((tool, j) => <g key={j} className={o.slTool} style={{ "--j": j } as CSSProperties}>
          <path className={o.slBeam} d={`M 1240 545 L ${tool.x} ${tool.y}`} pathLength={1} />
          <circle className={o.slToolRing} cx={tool.x} cy={tool.y} r="22" />
          <path className={o.slToolIcon} d={tool.icon} transform={`translate(${tool.x} ${tool.y})`} />
        </g>)}
      </svg>
      <ol className={o.slLog} aria-label="Logg">
        {log.map(line => <li key={line.n} data-test={line.test === undefined ? undefined : line.test ? "ok" : "fel"}>
          <span>{String(line.n).padStart(2, "0")}</span>{t(`loop${loop[line.station]}`)}{line.test !== undefined && <b>{line.test ? "✓" : "✗"}</b>}
        </li>)}
        {out && t("emphasis") && <li data-out=""><span>→</span>{t("emphasis")}</li>}
      </ol>
      <ol className={o.slStations}>
        {loop.map((n, i) => <li key={n} data-at={LOOP_AT[i]} style={{ "--i": i } as CSSProperties}>{edit(`loop${n}`)}</li>)}
      </ol>
      <span className={o.slOrbit} aria-hidden="true"><i /></span>
      <span className={o.slRunner} style={{ offsetPath: `path("${SLINGA_EXIT}")` }} aria-hidden="true" />
    </section>
    {t("note") && <h2 className={`${o.slNote} ${s.reveal}`} data-on={out} aria-hidden={!out}>{edit("note", <RichLines text={t("note")} emphasis={t("emphasis")} />)}</h2>}
  </div>;
}

/* ------------------------------------------------------------ veckoremsan */

const WEEK = { left: 96, top: 250, col: 268, gap: 17, rowTop: 318, row: 150, panel: 1140 };
const weekX = (day: number) => WEEK.left + day * (WEEK.col + WEEK.gap);
const dayOf = (value: string, fallback: number) => Math.min(5, Math.max(1, Math.round(Number(value)) || fallback)) - 1;

/**
 * Veckoremsan: måndag till fredag som i en kalender. Ett block per klick landar
 * på sina dagar (ett block kan spänna över flera). Sedan slutraden. Sist växer en
 * dag (fältet focusDay) ut över veckan och frågorna till den dagen kommer, en per klick.
 */
export function Veckan({ t, edit, step, still }: FormProps) {
  const days = t("days").split("|").map(day => day.trim()).filter(Boolean).slice(0, 5);
  const items = range(MAX_WEEK_ITEMS).filter(n => t(`item${n}`)).map(n => {
    const from = dayOf(t(`from${n}`), 1);
    return { n, from, to: Math.max(from, dayOf(t(`to${n}`), from + 1)), role: t(`role${n}`) || "human", row: 0 };
  });
  // Block som delar en dag staplas: raden är antalet tidigare block som överlappar.
  items.forEach((item, i) => { item.row = items.slice(0, i).filter(other => other.from <= item.to && other.to >= item.from).length; });
  const questions = range(3).filter(n => t(`question${n}`));
  const noteStep = items.length;
  const focusStep = noteStep + (t("note") ? 1 : 0);
  const shown = Math.min(items.length, step + 1);
  const resting = Boolean(t("note")) && step === noteStep;
  const focused = questions.length > 0 && step >= focusStep;
  const asked = focused ? step - focusStep + 1 : 0;
  const focusDay = dayOf(t("focusDay"), 5);
  // Panelen täcker fyra spalter från linje till linje och slutar vid dagens högra linje.
  const panelLeft = Math.max(WEEK.left + WEEK.col + WEEK.gap, weekX(focusDay) + WEEK.col + WEEK.gap - WEEK.panel);
  return <div className={o.vk} data-resting={resting} data-focused={focused} data-still={still}>
    <header className={o.vkHead}>
      <Kicker t={t} edit={edit} />
      {t("title") && <h2>{edit("title", <RichLines text={t("title")} emphasis={t("emphasis")} />)}</h2>}
    </header>
    <ol className={o.vkDays} aria-hidden="true">
      {range(5).map(d => <li key={d} data-focus={focused && d - 1 === focusDay || undefined} style={{ "--x": `${weekX(d - 1)}px` } as CSSProperties}>
        <span>{days[d - 1] ?? ""}</span>
      </li>)}
    </ol>
    <ol className={o.vkItems} aria-label={t("title") || undefined}>
      {items.map((item, i) => <li key={item.n} data-role={item.role} data-on={i < shown} data-now={!focused && !resting && i === shown - 1} data-span={item.to > item.from || undefined} aria-hidden={i >= shown}
        style={{ "--x": `${weekX(item.from)}px`, "--w": `${(item.to - item.from + 1) * WEEK.col + (item.to - item.from) * WEEK.gap}px`, "--y": `${WEEK.rowTop + item.row * WEEK.row}px` } as CSSProperties}>
        <strong>{edit(`item${item.n}`)}</strong>
        {t(`text${item.n}`) && <span>{edit(`text${item.n}`, <RichLines text={t(`text${item.n}`)} />)}</span>}
        {item.to > item.from && <svg className={o.vkLoop} viewBox="0 0 48 48" aria-hidden="true"><path d="M 38 18 A 15 15 0 1 0 39 30" /><path d="M 38 8 V 18 H 28" /></svg>}
      </li>)}
    </ol>
    {t("note") && <h2 className={`${o.vkNote} ${s.reveal}`} data-on={resting} aria-hidden={!resting}>{edit("note", <RichLines text={t("note")} emphasis={t("emphasis")} />)}</h2>}
    {questions.length > 0 && <section className={o.vkFocus} data-on={focused} aria-hidden={!focused} style={{ "--x": `${panelLeft}px`, "--from": `${weekX(focusDay) - panelLeft}px` } as CSSProperties}>
      {t("focusTitle") && <p className={o.vkFocusTitle}>{edit("focusTitle")}</p>}
      <ol>
        {questions.map((n, i) => <li key={n} className={s.reveal} data-on={i < asked} data-now={i === asked - 1} aria-hidden={i >= asked}><b aria-hidden="true">{i + 1}</b>{edit(`question${n}`, <RichLines text={t(`question${n}`)} />)}</li>)}
      </ol>
    </section>}
  </div>;
}

/* ---------------------------------------------------------------- pyramiden */

/** Pyramidens band nedifrån och upp: mitt x 1080, basen y 770, sex band à 90 px, från 760 till 180 px bredd. */
const PY = { cx: 1080, base: 770, band: 90, wide: 760, narrow: 180 };
function pyBand(i: number, count: number) {
  const width = (y: number) => PY.narrow + (y - (PY.base - count * PY.band)) * (PY.wide - PY.narrow) / (count * PY.band);
  const bottom = PY.base - i * PY.band, top = bottom - PY.band + 6;
  const wb = width(bottom), wt = width(top);
  return { top, bottom, mid: (top + bottom) / 2, points: `${PY.cx - wt / 2},${top} ${PY.cx + wt / 2},${top} ${PY.cx + wb / 2},${bottom} ${PY.cx - wb / 2},${bottom}` };
}

/** Avsatsen där markören landar på band i: vid bandets överkant, på vänster (-1) eller höger (1) sida. */
function pyLedge(i: number, count: number, side: -1 | 1) {
  const top = PY.base - i * PY.band - PY.band + 6;
  const width = PY.narrow + (top - (PY.base - count * PY.band)) * (PY.wide - PY.narrow) / (count * PY.band);
  return { x: PY.cx + side * (width / 2 - (i === count - 1 ? 34 : 24)), y: top - 11 };
}

/**
 * Markören (visualiseringspasset 1 oktober 2026): skolans väg är en klättring hopp för hopp uppför
 * högra sidan, i takt med att banden tänds nedifrån. Veckans väg börjar i toppen och studsar ned för
 * vänstra sidan, en båge per avsats, och varje band tänds när den landar. Tiderna följer CSS-animationerna
 * pyClimb (.3 s + i × .22 s) och pyFall (.2 s + i × .22 s).
 */
function pyToken(down: boolean, clock: number, count: number) {
  const hop = (a: { x: number; y: number }, b: { x: number; y: number }, k: number, h: number) =>
    ({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k - 4 * h * k * (1 - k) });
  const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
  if (!down) {
    let at = { x: PY.cx + PY.wide / 2 + 46, y: PY.base - 11 };
    for (let i = 0; i < count; i++) {
      const next = pyLedge(i, count, 1);
      const k = clamp01((clock - (.12 + i * .22)) / .2);
      if (k < 1) return hop(at, next, k, 22);
      at = next;
    }
    return at;
  }
  let at = { x: PY.cx, y: pyLedge(count - 1, count, 1).y };
  for (let j = 1; j < count; j++) {
    const next = pyLedge(count - 1 - j, count, -1);
    const k = clamp01((clock - (.2 + (j - 1) * .22)) / .22);
    if (k < 1) return hop(at, next, k * k * (3 - 2 * k), 46);
    at = next;
  }
  return at;
}

/**
 * Pyramiden: Blooms nivåer nedifrån och upp. Först klättrar ljuset som skolan
 * brukar göra och stannar vid den översta nivån. Sedan börjar det i toppen och
 * rinner nedåt. Sist en rad, med ett föremål bredvid (till exempel ett verktyg).
 */
export function Pyramid({ t, edit, step, still }: FormProps) {
  const levels = range(6).filter(n => t(`level${n}`));
  const down = step >= 1;
  const resting = Boolean(t("note")) && step >= 2;
  const top = levels.length - 1;
  const tipUp = PY.base - levels.length * PY.band + 20;
  const clock = useStepClock(Math.min(step, 1), still || resting, 4);
  const token = pyToken(down, clock, levels.length);
  return <div className={o.py} data-down={down} data-resting={resting} data-still={still}>
    <header className={o.pyHead}>
      <Kicker t={t} edit={edit} />
      {t("title") && <h2>{edit("title", <RichLines text={t("title")} emphasis={t("emphasis")} />)}</h2>}
    </header>
    <div className={o.pyText}>
      <section className={o.pyUpText} data-dim={down}>
        {t("upLabel") && <p className={o.pyLabel}>{edit("upLabel")}</p>}
        <p>{edit("upText", <RichLines text={t("upText")} />)}</p>
      </section>
      <section className={`${o.pyDownText} ${s.reveal}`} data-on={down} data-dim={resting} aria-hidden={!down}>
        {t("downLabel") && <p className={o.pyLabel}>{edit("downLabel")}</p>}
        <p>{edit("downText", <RichLines text={t("downText")} />)}</p>
      </section>
    </div>
    <svg className={o.pyShape} viewBox="0 0 1600 900" aria-hidden="true">
      {levels.map((n, i) => {
        const band = pyBand(i, levels.length);
        // Uppåt: nedersta först. Nedåt: översta först.
        return <polygon key={n} points={band.points} data-top={i === top || undefined} style={{ "--up": i, "--down": top - i } as CSSProperties} />;
      })}
      {/* Pilen uppåt till höger (skolans väg), nedåt till vänster (veckans väg). */}
      <path className={o.pyArrowUp} d={`M 1500 ${PY.base} V ${tipUp} M 1486 ${tipUp + 16} L 1500 ${tipUp} L 1514 ${tipUp + 16}`} pathLength={1} />
      <path className={o.pyArrowDown} d={`M 660 ${tipUp} V ${PY.base - 8} M 646 ${PY.base - 24} L 660 ${PY.base - 8} L 674 ${PY.base - 24}`} pathLength={1} />
    </svg>
    <ol className={o.pyLevels} aria-label={levels.map(n => t(`level${n}`)).join(", ")}>
      {levels.map((n, i) => <li key={n} data-top={i === top || undefined} style={{ "--y": `${pyBand(i, levels.length).mid}px`, "--up": i, "--down": top - i } as CSSProperties}>{edit(`level${n}`)}</li>)}
    </ol>
    <i className={o.pyToken} data-down={down} style={{ left: token.x, top: token.y } as CSSProperties} aria-hidden="true" />
    {t("here") && <p className={`${o.pyHere} ${s.reveal}`} data-on={down && !resting} aria-hidden={!down || resting}
      style={{ "--y": `${pyBand(top, levels.length).mid}px` } as CSSProperties}>{edit("here")}</p>}
    {t("image") && <img className={`${o.pyImage} ${s.reveal}`} data-on={resting} src={t("image")} alt={t("imageAlt")} aria-hidden={!resting} />}
    {t("note") && <h2 className={`${o.pyNote} ${s.reveal}`} data-on={resting} aria-hidden={!resting}>{edit("note", <RichLines text={t("note")} emphasis={t("emphasis")} />)}</h2>}
  </div>;
}

/* ------------------------------------------------------------ tre ord */

const TREORD = [{ key: "left", x: 330 }, { key: "mid", x: 800 }, { key: "right", x: 1270 }] as const;

/**
 * Tre ord: samma fält som stränderna (JAG · AI · JAG), utan sjön. Först alla tre
 * orden. Sedan lyser ett ord i taget med sina frågor under sig medan de andra
 * dämpas. Sist lyser de två yttre och påståendet kommer. Ordet i mitten står i
 * mono (maskinen), de yttre i rubriktypsnittet (människan).
 */
export function Treord({ t, edit, step, still }: FormProps) {
  const at = step >= 1 && step <= 3 ? TREORD[step - 1].key : null;
  const resting = Boolean(t("title")) && step >= 4;
  // Uppgiften vandrar: ett kort går från JAG till AI till JAG. Vid AI fälls varianter ut, vid jag efter bockas det av.
  const taskAt = step >= 3 ? "right" : step === 2 ? "mid" : "left";
  return <div className={o.tre} data-resting={resting} data-focus={at ?? undefined} data-still={still}>
    <Kicker t={t} edit={edit} className={o.treKicker} />
    <div className={o.treRun} data-on={step >= 1} aria-hidden="true">
      <i className={o.treTrack} />
      <span className={o.treTask} data-at={taskAt} data-variants={step === 2 || undefined} data-done={step >= 3 || undefined}>
        <b /><b /><b />
        <svg viewBox="0 0 24 24"><path d="M5 12.5 L10 17 L19 7" pathLength={1} /></svg>
      </span>
    </div>
    {TREORD.map(({ key, x }) => {
      const lit = !at && !resting || at === key || resting && key !== "mid";
      const open = at === key;
      return <section key={key} className={o.treWord} data-word={key} data-lit={lit} style={{ "--x": `${x}px` } as CSSProperties}>
        <p className={o.treBig}>{edit(key)}</p>
        <div className={`${o.treText} ${s.reveal}`} data-on={open} aria-hidden={!open}>
          {t(`${key}Label`) && <p className={o.treLabel}>{edit(`${key}Label`)}</p>}
          <p>{edit(`${key}Text`, <RichLines text={t(`${key}Text`)} />)}</p>
        </div>
      </section>;
    })}
    {t("title") && <div className={`${o.treFinal} ${s.reveal}`} data-on={resting} aria-hidden={!resting}>
      <h2>{edit("title", <RichLines text={t("title")} emphasis={t("emphasis")} />)}</h2>
      {t("after") && <p>{edit("after", <RichLines text={t("after")} />)}</p>}
    </div>}
  </div>;
}

/* ---------------------------------------------------------------- byrån */

/**
 * Byrån: agenterna från duken som en byrås teamsida, ett kort per agent med
 * markör, namn och vad den gör. Nästa klick dämpas korten, en sjunde plats står
 * tom och andra ledet kommer.
 */
/**
 * Var markörerna stod på duken (duken.tsx: vilolägen plus arbetsytans hörn 96, 240), i fältordningen.
 * På byrån flyger samma pekare in därifrån till sin rad (visualiseringspasset), så att teamet är
 * samma sex som nyss byggde affischen.
 */
const CANVAS_SPOTS: ReadonlyArray<readonly [number, number]> = [[716, 552], [1386, 710], [876, 445], [826, 620], [796, 492], [626, 498]];

export function Byra({ t, edit, step, still }: FormProps) {
  const agents = range(MAX_AGENTS).filter(n => t(`agent${n}`));
  const asked = Boolean(t("title2")) && step >= 1;
  return <div className={o.byra} data-asked={asked} data-still={still}>
    <header className={o.byHead}>
      <Kicker t={t} edit={edit} />
      <h2>
        {t("title") && <span className={o.byLine}>{edit("title", <RichLines text={t("title")} emphasis={t("emphasis")} />)}</span>}
        {t("title2") && <span className={`${o.byLine} ${s.reveal}`} data-on={asked} aria-hidden={!asked}>{edit("title2", <RichLines text={t("title2")} emphasis={t("emphasis")} />)}</span>}
      </h2>
    </header>
    <ol className={o.team} aria-label={agents.map(n => t(`agent${n}`)).join(", ")}>
      {agents.map((n, i) => {
        const [sx, sy] = CANVAS_SPOTS[i] ?? CANVAS_SPOTS[0];
        // Pekarens plats i kolofonen: två spalter (672 px och 64 px mellanrum), rader om cirka 82 px.
        const fx = 96 + (i % 2) * 736 + 12, fy = 380 + Math.floor(i / 2) * 82 + 41;
        return <li key={n} style={{ "--i": i, "--dx": `${sx - fx}px`, "--dy": `${sy - fy}px` } as CSSProperties}>
        <svg className={o.teamCursor} viewBox="0 0 24 24" aria-hidden="true"><path d="M3 2 L20 11 L12 13 L9 21 Z" /></svg>
        <strong>{edit(`agent${n}`)}</strong>
        {t(`agentDoes${n}`) && <small>{edit(`agentDoes${n}`)}</small>}
      </li>;
      })}
      <li className={o.teamEmpty} data-on={asked} aria-hidden="true" style={{ "--i": agents.length } as CSSProperties}><span>?</span></li>
    </ol>
  </div>;
}

/* ---------------------------------------------------------------- bryggan */

/** Stoftet i bryggan: vinkel, längd på varvet och start, utspritt men samma vid varje rendering. */
const DUST = Array.from({ length: 64 }, (_, i) => ({
  a: (seeded(i + 7) * 360).toFixed(1), dur: (3.2 + seeded(i + 3) * 2.4).toFixed(2), delay: (-seeded(i + 19) * 5.6).toFixed(2),
}));
const exponentOf = (value: string, fallback: number) => {
  const n = Math.round(Number(value.replace("−", "-")));
  return Number.isFinite(n) && value.trim() !== "" ? n : fallback;
};

/**
 * Bryggan mellan delarna (Joels önskan 1 oktober): en loop som kan ligga kvar så
 * länge Joel vill, medan han går över till nästa del. En ändlös zoom genom
 * Eames-ramar mot nästa dels nivå (portalen i mitten), stoft som ger fart, delens
 * namn och skalmätaren som räknar tiopotenserna, en per varv, från `fran` till `till`.
 * Längst ned en färdkarta: föreläsningens delar, de klara ifyllda och ljuset på väg
 * till nästa. Täcker världen helt; nästa slide zoomar fram den igen. Ett läge.
 *
 * Med fältet film (nio, tre, pixlar, vecka eller ja) spelas bryggan i stället som en film på
 * 15–18 sekunder (bryggfilm.tsx, 3 oktober 2026) och står sedan kvar på sin slutbild.
 */
export function Brygga(props: FormProps) {
  return props.t("film") ? <BryggFilm {...props} /> : <BryggaLoop {...props} />;
}

function BryggaLoop({ t, edit, still }: FormProps) {
  const from = exponentOf(t("fran"), 7);
  const to = exponentOf(t("till"), from);
  const out = t("riktning") ? t("riktning") === "ut" : to > from;
  const level = SKALA_LEVELS.find(item => item.p === to) ?? SKALA_LEVELS[0];
  const place = t("plats") || level.label;
  // Portalen visar nästa slides nivå (fältet portal, standard till), så att nästa slide kan öppnas ur den.
  const portal = SKALA_LEVELS.find(item => item.p === exponentOf(t("portal"), to)) ?? level;
  const parts = t("delar").split("|").map(part => part.trim()).filter(Boolean);
  const exponents = t("nivaer").split("|").map(value => exponentOf(value, NaN));
  const current = Math.max(1, Math.min(parts.length || 1, Math.round(Number(t("del"))) || 1));
  // Skalmätaren räknar en tiopotens per varv i tunneln och börjar om när den nått målet.
  const [lap, setLap] = useState(0);
  const span = Math.abs(to - from);
  const shown = span ? from + Math.sign(to - from) * (lap % (span + 1)) : from;
  const onLap = (event: AnimationEvent<HTMLDivElement>) => { if (event.target === event.currentTarget) setLap(n => n + 1); };
  return <div className={o.br} data-out={out} data-still={still}>
    <div className={o.brField} aria-hidden="true">
      <div className={o.brTunnel} onAnimationIteration={onLap}>
        {range(6).map(k => <i key={k} data-major={k % 2 === 0 || undefined} style={{ "--k": k - 2 } as CSSProperties}><b /><b /><b /><b /></i>)}
      </div>
      <div className={o.brDust}>
        {DUST.map((dust, i) => <i key={i} style={{ "--a": `${dust.a}deg`, "--dur": `${dust.dur}s`, "--delay": `${dust.delay}s` } as CSSProperties} />)}
      </div>
      <figure className={o.brPortal}><img src={t("image") || portal.src} alt="" /></figure>
      <div className={o.brScrim} />
    </div>
    <div className={o.brLockup}>
      <Kicker t={t} edit={edit} />
      {t("title") && <h2>{edit("title", <RichLines text={t("title")} emphasis={t("emphasis")} />)}</h2>}
      <p className={o.brHud} aria-label={`10 upphöjt till ${to} meter${place ? `, ${place}` : ""}`}>
        {/* Nyckeln byts vid varje tiopotens, så att talet rullar fram på nytt. */}
        <span key={shown} className={o.brTick}>10<sup>{EXPONENT(shown)}</sup> m</span><i aria-hidden="true">→</i><span>10<sup>{EXPONENT(to)}</sup> m</span>
        {place && <em>{t("plats") ? edit("plats") : place}</em>}
      </p>
    </div>
    {parts.length > 1 && <ol className={o.brRoute} style={{ "--n": parts.length, "--at": current - 1 } as CSSProperties} aria-label={`Del ${current} av ${parts.length}`}>
      {parts.map((part, i) => <li key={i} data-state={i < current - 1 ? "done" : i === current - 1 ? "next" : "future"} style={{ "--i": i } as CSSProperties}>
        {Number.isFinite(exponents[i]) && <small>10<sup>{EXPONENT(exponents[i])}</sup></small>}
        <i aria-hidden="true" />
        <span>{part}</span>
      </li>)}
      {current > 1 && <b className={o.brRunner} aria-hidden="true" />}
    </ol>}
  </div>;
}
