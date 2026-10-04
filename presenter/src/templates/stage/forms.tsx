"use client";

/* eslint-disable @next/next/no-img-element */
import { PriceFall } from "./prisfall";
import { Fragment, useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { useSceneReview } from "@/lib/share/scene-review";
import { Document, MediaFrame, PuzzleGhost, RichLines, SeriesLights, seeded, seriesOf } from "./kit";
import { MAX_ITEMS, MAX_MEDIA, MAX_MESSAGES, MAX_VALUES, type StageLayout } from "./stage-forms";
import s from "./stage.module.css";
import f from "./forms.module.css";

export type FormProps = {
  t: (key: string) => string;
  /** Lindar innehållet i inline-redigering för fältet. Utan node visas fältets text. */
  edit: (key: string, node?: ReactNode) => ReactNode;
  step: number;
  count: number;
  still: boolean;
  layout: StageLayout;
  /** Horisontens höjd i scenens pixlar (av 900). */
  horizonY: number;
  /** Ljusets läge längs horisonten i scenens pixlar (av 1600). */
  lightX: number;
};

const range = (max: number) => Array.from({ length: max }, (_, i) => i + 1);

export function Kicker({ t, edit, className = "" }: Pick<FormProps, "t" | "edit"> & { className?: string }) {
  return t("kicker") ? <p className={`${s.kicker} ${className}`}>{edit("kicker")}</p> : null;
}

export function Credit({ t, edit }: Pick<FormProps, "t" | "edit">) {
  return t("credit") ? <p className={f.credit}>{edit("credit")}</p> : null;
}

/** Adressen till övningen, stort nere till höger – så att den går att skriva av från sista raden. */
export function Adress({ t, edit }: Pick<FormProps, "t" | "edit">) {
  return t("adress") ? <p className={f.adress}>{edit("adress")}</p> : null;
}

/** En rund illustration till höger, med bildtext. För affisch och rader i helbild. */
function SideImage({ t, edit }: Pick<FormProps, "t" | "edit">) {
  if (!t("image")) return null;
  return <figure className={f.sideImage}>
    <img src={t("image")} alt={t("imageAlt")} />
    {t("imageCaption") && <figcaption>{edit("imageCaption")}</figcaption>}
  </figure>;
}

/* ------------------------------------------------------------ affisch */

/** Ord som ska jämföras: ord och skiljetecken, med mellanslaget efter (så att en radbrytning aldrig börjar med ett). */
const tokens = (line: string) => line.match(/(?:[\p{L}\p{N}]+|[^\s\p{L}\p{N}])\s*/gu) ?? [];

/** Längsta gemensamma följd av ord: det som står kvar, det som går ut och det som kommer in. */
function diffWords(from: string, to: string): { text: string; kind: "same" | "out" | "in" }[] {
  const a = tokens(from), b = tokens(to);
  const same = (i: number, j: number) => a[i].trim() === b[j].trim();
  const lcs = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) for (let j = b.length - 1; j >= 0; j--) lcs[i][j] = same(i, j) ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
  const parts: { text: string; kind: "same" | "out" | "in" }[] = [];
  let i = 0, j = 0;
  while (i < a.length || j < b.length) {
    // Ett kvarstående ord behåller mellanslaget efter sig om någon av meningarna har det (ett ord kan följa i den ena).
    if (i < a.length && j < b.length && same(i, j)) { parts.push({ text: b[j].trimEnd() + (/\s$/.test(a[i]) || /\s$/.test(b[j]) ? " " : ""), kind: "same" }); i++; j++; }
    // Det gamla ordet först, så att det nya växer fram där det gamla stod.
    else if (i < a.length && (j >= b.length || lcs[i + 1][j] >= lcs[i][j + 1])) { parts.push({ text: a[i], kind: "out" }); i++; }
    else { parts.push({ text: b[j], kind: "in" }); j++; }
  }
  return parts;
}

/**
 * Ekot blir rubriken (fältet echo): först står den gamla meningen, sedan glider
 * orden som byts ut och de nya in på samma plats. Stilla lägen visar rubriken.
 */
function Morph({ from, to, still }: { from: string; to: string; still: boolean }) {
  const a = from.split("\n"), b = to.split("\n");
  if (still || a.length !== b.length) return <RichLines text={to} />;
  return <span>{b.map((line, i) => <span key={i} className={s.line}>{diffWords(a[i], line).map((part, j) => part.kind === "same"
    ? <Fragment key={j}>{part.text}</Fragment>
    : <span key={j} className={part.kind === "in" ? f.morphIn : f.morphOut} aria-hidden={part.kind === "out" || undefined}><span>{part.text}</span></span>)}</span>)}</span>;
}

export function Poster({ t, edit, step, still }: FormProps) {
  const blocks = ["title", "title2", "title3"].filter(key => t(key));
  return <><SideImage t={t} edit={edit} />{t("vis") === "prisfall" && <PriceFall t={t} step={step} still={still} />}<div className={f.poster} data-size={t("size") || "l"}>
    <Kicker t={t} edit={edit} />
    {blocks.map((key, i) => <h2 key={key} className={`${f.posterTitle} ${s.reveal}`} data-on={step >= i} data-block={i} aria-hidden={step < i}>
      {edit(key, i === 0 && t("echo") ? <Morph from={t("echo")} to={t(key)} still={still} /> : <RichLines text={t(key)} emphasis={t("emphasis")} />)}
    </h2>)}
    {t("caption") && <p className={f.posterCaption}>{edit("caption", <RichLines text={t("caption")} />)}</p>}
  </div></>;
}

/* -------------------------------------------------------------- citat */

export function Quote({ t, edit, step }: FormProps) {
  const image = t("image");
  const place = t("imagePlace") === "below" ? "below" : "side";
  return <>
    {image && <figure className={f.quoteFigure} data-place={place}><img src={image} alt={t("imageAlt")} /></figure>}
    <div className={f.quote} data-image={Boolean(image)} data-place={place} data-size={t("size") || "l"}>
      <Kicker t={t} edit={edit} />
      <blockquote className={f.quoteText}>{edit("quote", <RichLines text={t("quote")} emphasis={step >= 1 ? t("emphasis") : ""} />)}</blockquote>
      {t("attribution") && <cite className={f.quoteCite}>{edit("attribution")}</cite>}
      {t("after") && <p className={`${f.quoteAfter} ${s.reveal}`} data-on={step >= 1} aria-hidden={step < 1}>{edit("after", <RichLines text={t("after")} />)}</p>}
    </div>
  </>;
}

/* -------------------------------------------------------------- chatt */

const defaultLabel: Record<string, string> = { du: "Du", elev: "Elev", ai: "AI", talare: "Talare", not: "" };

export function Chat({ t, edit, step }: FormProps) {
  const messages = range(MAX_MESSAGES).filter(n => t(`msg${n}`)).map((n, index) => ({ n, index, who: (t(`who${n}`) || (index % 2 ? "ai" : "du")).toLowerCase() }));
  const noteStep = messages.length;
  const note = t("note");
  const image = t("image");
  const resting = Boolean(note) && step >= noteStep;
  return <>
    <div className={f.chatHead} data-resting={resting}>
      <Kicker t={t} edit={edit} />
      {t("title") && <h2 className={f.chatHeading}>{edit("title", <RichLines text={t("title")} />)}</h2>}
    </div>
    <section className={f.chatPanel} data-device={t("device") || "panel"} data-size={t("size") || "l"} data-resting={resting} data-titled={Boolean(t("title"))} aria-label={t("chatTitle") || "Chatt"}>
      {t("chatTitle") && <header className={f.chatBar}><i className={s.aiDot} /><span>{edit("chatTitle")}</span></header>}
      <div className={f.chatThread}>
        {messages.map(({ n, index, who }) => <div key={n} className={`${f.bubble} ${s.reveal}`} data-who={who} data-on={step >= index} aria-hidden={step < index}>
          {(t(`label${n}`) || defaultLabel[who]) && <small>{who === "ai" ? <i className={s.aiDot} /> : who === "not" ? null : <i className={s.humanDot} />}{edit(`label${n}`, <>{t(`label${n}`) || defaultLabel[who]}</>)}</small>}
          <p>{edit(`msg${n}`, <RichLines text={t(`msg${n}`)} emphasis={t(`mark${n}`)} />)}</p>
        </div>)}
      </div>
    </section>
    {image && <figure className={`${f.chatImage} ${s.reveal}`} data-on={resting} aria-hidden={!resting}><img src={image} alt={t("imageAlt")} /></figure>}
    {note && <p className={`${f.chatNote} ${s.reveal}`} data-on={resting} data-with-image={Boolean(image)} aria-hidden={!resting}>{edit("note", <RichLines text={note} emphasis={t("emphasis")} />)}</p>}
  </>;
}

/* ----------------------------------------------------------- ordfält */

export function Words({ t, edit, step }: FormProps) {
  const words = t("words").split("|").map(word => word.trim()).filter(Boolean);
  return <>
    <Kicker t={t} edit={edit} className={f.wordsKicker} />
    {edit("words", <div className={f.wordField} data-step={step} aria-label={words.join(", ")}>
      {words.map((word, i) => {
        const size = 30 + Math.round(seeded(i + 31) * 30);
        const lift = Math.round((seeded(i + 19) - .5) * 28);
        const tilt = ((seeded(i + 5) - .5) * 5).toFixed(1);
        return <span key={i} className={f.word} style={{ fontSize: size, "--i": i, "--lift": `${lift}px`, "--tilt": `${tilt}deg`, "--drift": `${Math.round((seeded(i + 3) - .5) * 80)}px` } as CSSProperties} aria-hidden="true">{word}</span>;
      })}
    </div>)}
    {t("title") && <h2 className={`${f.wordsTitle} ${s.reveal}`} data-on={step >= 1} aria-hidden={step < 1}>{edit("title", <RichLines text={t("title")} emphasis={t("emphasis")} />)}</h2>}
  </>;
}

/* ---------------------------------------------------------- stora tal */

/** Uppräkningens kurva: snabbt först, sedan allt långsammare in mot talet. */
const countCurve = (p: number) => 1 - (1 - p) ** 3;

/**
 * Ett tal som räknas upp från noll när läget kommer. Granskningens ram (?direkt=1) visar talet färdigt,
 * så att granskningens bilder inte fångar det mitt i uppräkningen, och ?simtid visar talet vid den
 * sekunden (mellanlagen.mjs). Spelaren räknar som vanligt; se lib/share/scene-review.ts.
 */
export function CountUp({ value, run }: { value: string; run: boolean }) {
  const trimmed = value.trim();
  const numeric = /^[−-]?\d+([.,]\d+)?$/.test(trimmed);
  const target = numeric ? parseFloat(trimmed.replace("−", "-").replace(",", ".")) : 0;
  const [shown, setShown] = useState<{ target: number; value: number } | null>(null);
  const review = useSceneReview();
  const reviewing = review.frame || review.simtid !== null;
  useEffect(() => {
    if (!numeric || !run || document.hidden || reviewing) return;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      // Bildrutans tidsstämpel kan ligga före start; utan golvet blinkar ett negativt tal förbi.
      const p = Math.max(0, Math.min(1, (now - start) / 1300));
      setShown(p < 1 ? { target, value: Math.round(target * countCurve(p)) } : null);
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [numeric, run, target, reviewing]);
  if (numeric && run && review.simtid !== null && review.simtid < 1.3) return <>{String(Math.round(target * countCurve(review.simtid / 1.3)))}</>;
  const counting = numeric && run && !reviewing && shown !== null && shown.target === target;
  return <>{counting ? String(shown.value) : trimmed}</>;
}

/** Ett tal som räknas om från förra värdet (fältet from) till dagens. Granskningen som i CountUp. */
function CountFrom({ from, to, run }: { from: string; to: string; run: boolean }) {
  const a = parseFloat(from.replace(",", ".")), b = parseFloat(to.replace(",", "."));
  const valid = Number.isFinite(a) && Number.isFinite(b);
  // Börjar på förra värdet, så att dagens tal aldrig blinkar till före räkningen. En dold flik visar slutvärdet.
  const [shown, setShown] = useState<{ from: number; value: number } | null>(() => run && valid && typeof document !== "undefined" && !document.hidden ? { from: a, value: Math.round(a) } : null);
  const review = useSceneReview();
  const reviewing = review.frame || review.simtid !== null;
  useEffect(() => {
    if (!run || !valid || document.hidden || reviewing) return;
    let frame = 0;
    const start = performance.now() + 350;
    const tick = (now: number) => {
      const p = Math.max(0, Math.min(1, (now - start) / 1400));
      setShown(p < 1 ? { from: a, value: Math.round(a + (b - a) * countCurve(p)) } : null);
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [run, valid, a, b, reviewing]);
  if (run && valid && review.simtid !== null && review.simtid < 1.75) {
    return <>{String(Math.round(a + (b - a) * countCurve(Math.max(0, (review.simtid - .35) / 1.4))))}</>;
  }
  const counting = run && valid && !reviewing && shown !== null && shown.from === a;
  return <>{counting ? String(shown.value) : to.trim()}</>;
}

export function Stats({ t, edit, step, still }: FormProps) {
  const values = range(MAX_VALUES).filter(n => t(`value${n}`));
  // Förändringen (fälten from1–4): på första notens klick räknas talet om från förra värdet och de andra dämpas.
  const changing = values.some(n => t(`from${n}`));
  const focus = changing && step === 1;
  const unitPct = t("unit").trim() === "%";
  return <div className={f.stats} data-count={values.length} data-focus={focus || undefined} data-settled={changing && step >= 2 || undefined}>
    <Kicker t={t} edit={edit} />
    {t("title") && <h2 className={f.statsTitle}>{edit("title", <RichLines text={t("title")} />)}</h2>}
    <div className={f.statRow}>
      {values.map((n, i) => {
        const dots = Math.max(0, Math.min(10, Number(t(`dots${n}`)) || 0));
        const numeric = /^[−-]?\d+([.,]\d+)?$/.test(t(`value${n}`).trim());
        const from = t(`from${n}`).trim();
        const moving = focus && Boolean(from);
        const share = (value: string) => Math.max(0, Math.min(1, (parseFloat(value.replace(",", ".")) || 0) / 100));
        return <figure key={n} className={f.stat} data-index={i} data-text={!numeric} data-moving={moving || undefined}>
          <strong>{edit(`value${n}`, <>{moving
            ? <CountFrom from={from} to={t(`value${n}`)} run={!still} />
            : <CountUp value={t(`value${n}`)} run={!still && (!changing || step === 0)} />}<span className={f.unit}>{t("unit")}</span></>)}</strong>
          <figcaption>{edit(`label${n}`, <RichLines text={t(`label${n}`)} />)}</figcaption>
          {dots > 0 && <span className={f.dots} aria-label={`${dots} av 10`}>{range(10).map(d => <i key={d} data-on={d <= dots} style={{ transitionDelay: still ? "0s" : `${.3 + d * .06}s` }} />)}</span>}
          {from && <span className={f.statFrom} data-on={moving} aria-hidden={!moving} style={{ "--from": share(from), "--to": share(t(`value${n}`)) } as CSSProperties}>
            {unitPct && <i />}<small>{edit("fromLabel")}{t("fromLabel") ? " · " : ""}{edit(`from${n}`)}{t("unit")}</small>
          </span>}
        </figure>;
      })}
    </div>
    {["note", "note2"].filter(key => t(key)).map((key, i) => <p key={key} className={`${key === "note" ? f.statsNote : f.statsNote2} ${s.reveal}`} data-on={step >= i + 1} aria-hidden={step < i + 1}>{edit(key, <RichLines text={t(key)} />)}</p>)}
  </div>;
}

/* ---------------------------------------------------------- två sidor */

export function Split({ t, edit, step }: FormProps) {
  return <div className={f.splitWrap}>
    <Kicker t={t} edit={edit} />
    {t("title") && <h2 className={f.splitTitle}>{edit("title", <RichLines text={t("title")} />)}</h2>}
    <div className={f.split}>
      {(["left", "right"] as const).map((side, i) => <article key={side} className={`${f.side} ${s.reveal}`} data-on={step >= i} data-role={t(`${side}Role`) || "neutral"} aria-hidden={step < i}>
        <small>{edit(`${side}Label`)}</small>
        <p>{edit(`${side}Text`, <RichLines text={t(`${side}Text`)} />)}</p>
      </article>)}
    </div>
    {t("note") && <p className={`${f.splitNote} ${s.reveal}`} data-on={step >= 2} aria-hidden={step < 2}>{edit("note", <RichLines text={t("note")} emphasis={t("emphasis")} />)}</p>}
  </div>;
}

/* -------------------------------------------------------------- rader */

/**
 * Högen före listan (fältet pile): tjugo chattskärmbilder utan läsbar text faller
 * i en hög. Nästa klick glider högen undan och dämpas, och listan börjar.
 */
function Pile({ count, aside }: { count: number; aside: boolean }) {
  return <div className={f.pile} data-aside={aside} aria-hidden="true">
    {Array.from({ length: count }, (_, i) => {
      const x = 560 + seeded(i + 11) * 330, y = 150 + seeded(i + 23) * 330, tilt = (seeded(i + 37) - .5) * 30;
      return <span key={i} className={f.pileShot} style={{ "--x": `${Math.round(x)}px`, "--y": `${Math.round(y)}px`, "--tilt": `${tilt.toFixed(1)}deg`, "--i": i } as CSSProperties}>
        {Array.from({ length: 5 }, (_, j) => <i key={j} data-who={(i + j) % 2 ? "ai" : "du"} style={{ width: `${Math.round(38 + seeded(i * 7 + j) * 52)}%` }} />)}
      </span>;
    })}
  </div>;
}

/**
 * Formler som glittrar och sjunker (fälten sink1–3): när sliden kommer lyfter tre
 * välkända ”magiska” promptformler över vattnet och sjunker. Sedan kommer listan.
 */
function Sinking({ t, edit, still }: Pick<FormProps, "t" | "edit" | "still">) {
  const sinks = range(3).filter(n => t(`sink${n}`));
  return <div className={f.sinking} data-still={still} aria-label={sinks.map(n => t(`sink${n}`)).join(" ")}>
    {sinks.map((n, i) => <p key={n} className={f.sink} style={{ "--i": i, "--x": `${[130, 420, 210][i] ?? 160}px`, "--y": `${[300, 400, 500][i] ?? 300}px` } as CSSProperties}>{edit(`sink${n}`)}</p>)}
  </div>;
}

export function Stack({ t, edit, step, still }: FormProps) {
  const items = range(MAX_ITEMS).filter(n => t(`item${n}`));
  const note = t("note");
  const pile = Math.max(0, Math.min(40, Math.round(Number(t("pile")) || 0)));
  const offset = pile ? 1 : 0;
  const resting = Boolean(note) && step >= items.length + offset;
  const sinking = range(3).some(n => t(`sink${n}`));
  return <><SideImage t={t} edit={edit} />
    {pile > 0 && <Pile count={pile} aside={step >= 1} />}
    {sinking && <Sinking t={t} edit={edit} still={still} />}
    <div className={f.stack} data-count={items.length} data-resting={resting} data-sinking={sinking && !still ? "" : undefined}>
    <Kicker t={t} edit={edit} />
    {t("title") && <h2 className={f.stackTitle}>{edit("title", <RichLines text={t("title")} emphasis={t("emphasis")} />)}</h2>}
    <ol className={f.stackList}>
      {items.map((n, i) => <li key={n} className={s.reveal} data-on={step >= i + offset} data-role={t(`role${n}`) || "neutral"} aria-hidden={step < i + offset}>
        {t(`tag${n}`) && <span className={f.tag}>{edit(`tag${n}`)}</span>}
        <span className={f.itemText}>{edit(`item${n}`, <RichLines text={t(`item${n}`)} />)}</span>
      </li>)}
    </ol>
    {note && <p className={`${f.stackNote} ${s.reveal}`} data-on={resting} aria-hidden={!resting}>{edit("note", <RichLines text={note} emphasis={t("emphasis")} />)}</p>}
  </div></>;
}

/* -------------------------------------------------------------- media */

export function Media({ t, edit, step, still }: FormProps) {
  const items = range(MAX_MEDIA).filter(n => t(`media${n}`) || t(`caption${n}`) || t(`doc${n}`));
  // Prompt och medium får var sitt klick; utan prompt kommer mediet direkt.
  const plan = items.reduce<{ n: number; prompt: number; media: number }[]>((acc, n) => {
    const first = acc.length ? acc[acc.length - 1].media + 1 : 0;
    const prompted = Boolean(t(`prompt${n}`));
    return [...acc, { n, prompt: prompted ? first : -1, media: prompted ? first + 1 : first }];
  }, []);
  const noteStep = plan.length ? plan[plan.length - 1].media + 1 : 0;
  const resting = Boolean(t("note")) && step >= noteStep;
  const current = plan.filter(item => step >= (item.prompt >= 0 ? item.prompt : item.media)).pop() ?? plan[0];
  const anchor = Number(t("anchor")) || 0;
  if (anchor && plan.some(item => item.n === anchor)) return <MediaAnchor t={t} edit={edit} step={step} still={still} plan={plan} anchor={anchor} resting={resting} current={current} />;
  // Slutraden som en notis (formpasset 30 september): mediet står kvar, dämpat, och notisen glider in över det.
  const notice = t("noteStyle") === "notis";
  return <>
    <div className={f.mediaHead} data-resting={resting} data-notice={notice || undefined}>
      <Kicker t={t} edit={edit} />
      {t("title") && <h2 className={f.mediaTitle}>{edit("title", <RichLines text={t("title")} />)}</h2>}
    </div>
    {plan.map(item => {
      const isCurrent = !resting && item.n === current?.n;
      const showMedia = step >= item.media;
      const index = items.indexOf(item.n);
      return <div key={item.n} className={f.mediaItem} data-current={isCurrent} data-past={!isCurrent && showMedia && !resting} data-resting={resting} data-notice={notice || undefined} data-count={items.length} data-titled={Boolean(t("title"))} style={{ "--col": index % 3, "--row": Math.floor(index / 3) } as CSSProperties}>
        {item.prompt >= 0 && <p className={`${f.mediaPrompt} ${s.reveal}`} data-on={isCurrent} aria-hidden={!isCurrent}><small><i className={s.humanDot} />{t("promptLabel") ? edit("promptLabel") : "Prompt"}</small>{edit(`prompt${item.n}`, <RichLines text={t(`prompt${item.n}`)} />)}</p>}
        <div className={`${f.mediaBody} ${s.reveal}`} data-on={showMedia} aria-hidden={!showMedia}>
          {t(`stamp${item.n}`) && <span className={f.mediaStamp} data-on={showMedia && !resting}>{edit(`stamp${item.n}`)}</span>}
          <MediaFrame src={t(`media${item.n}`)} kind={t(`kind${item.n}`)} alt={t(`alt${item.n}`) || t(`caption${item.n}`)} active={isCurrent && step === item.media} still={still}
            doc={t(`doc${item.n}`) ? edit(`doc${item.n}`, <Document text={t(`doc${item.n}`)} className={s.mediaDocBody} />) : undefined} sound={t(`sound${item.n}`) === "ja"}
            caption={t(`caption${item.n}`) ? edit(`caption${item.n}`, <RichLines text={t(`caption${item.n}`)} />) : undefined} />
        </div>
      </div>;
    })}
    {t("note") && (notice
      ? <div className={`${f.mediaNotice} ${s.reveal}`} data-on={resting} aria-hidden={!resting} role="status">
        <span className={f.noticeIcon} aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="15.5" rx="3" /><path d="M3.5 10 H20.5 M8 3 V7 M16 3 V7" /></svg></span>
        <small>{t("noteLabel") ? edit("noteLabel") : "Påminnelse"}</small>
        <p>{edit("note", <RichLines text={t("note")} />)}</p>
      </div>
      : <p className={`${f.mediaNote} ${s.reveal}`} data-on={resting} data-count={items.length} aria-hidden={!resting}>{edit("note", <RichLines text={t("note")} />)}</p>)}
  </>;
}

type PlanItem = { n: number; prompt: number; media: number };

/**
 * Ett foto, fem vägar in (fältet anchor, ett materialgrepp ur en föreläsning). Underlaget
 * stannar kvar: stort i första läget, sedan fäst uppe till vänster medan varje
 * prompt och resultat kommer bredvid. Förra resultatet glider ned under fotot.
 * Vid slutraden fälls alla ut runt fotot, med en ljustråd till var och en.
 */
function MediaAnchor({ t, edit, step, still, plan, anchor, resting, current }: Pick<FormProps, "t" | "edit" | "step" | "still"> & { plan: PlanItem[]; anchor: number; resting: boolean; current?: PlanItem }) {
  const others = plan.filter(item => item.n !== anchor);
  const ring = (k: number) => {
    const angle = (-90 + k * 360 / Math.max(1, others.length)) * Math.PI / 180;
    return { x: Math.round(1050 + 340 * Math.cos(angle)), y: Math.round(440 + 250 * Math.sin(angle)) };
  };
  return <div className={f.anchor} data-resting={resting}>
    <div className={f.anHead} data-resting={resting}>
      <Kicker t={t} edit={edit} />
      {t("title") && <h2 className={f.mediaTitle}>{edit("title", <RichLines text={t("title")} />)}</h2>}
    </div>
    <svg className={f.anSpokes} viewBox="0 0 1600 900" aria-hidden="true">
      {others.map((item, k) => { const p = ring(k); return <path key={item.n} d={`M1050 440 L${p.x} ${p.y}`} pathLength={1} data-on={resting} style={{ "--k": k } as CSSProperties} />; })}
    </svg>
    {plan.map(item => {
      const isAnchor = item.n === anchor;
      const isCurrent = !resting && item.n === current?.n;
      const shown = step >= item.media;
      const k = others.indexOf(item);
      const mode = isAnchor ? (resting ? "center" : isCurrent ? "main" : "pinned") : resting ? "ring" : isCurrent ? "main" : shown ? "strip" : "hidden";
      const p = k >= 0 ? ring(k) : { x: 0, y: 0 };
      const caption = t(`caption${item.n}`);
      return <div key={item.n} className={f.anItem} data-mode={mode} data-anchor={isAnchor}
        style={{ "--sx": `${110 + (k % 2) * 130}px`, "--sy": `${480 + Math.floor(k / 2) * 82}px`, "--rx": `${p.x}px`, "--ry": `${p.y}px`, "--k": Math.max(0, k) } as CSSProperties}>
        {item.prompt >= 0 && <p className={`${f.anPrompt} ${s.reveal}`} data-on={isCurrent} aria-hidden={!isCurrent}><small><i className={s.humanDot} />{t("promptLabel") ? edit("promptLabel") : "Prompt"}</small>{edit(`prompt${item.n}`, <RichLines text={t(`prompt${item.n}`)} />)}</p>}
        <div className={`${f.anBody} ${s.reveal}`} data-on={shown} aria-hidden={!shown}>
          <MediaFrame src={t(`media${item.n}`)} kind={t(`kind${item.n}`)} alt={t(`alt${item.n}`) || caption} active={isCurrent && step === item.media} still={still}
            doc={t(`doc${item.n}`) ? edit(`doc${item.n}`, <Document text={t(`doc${item.n}`)} className={s.mediaDocBody} />) : undefined} sound={t(`sound${item.n}`) === "ja"}
            caption={caption ? edit(`caption${item.n}`, <RichLines text={caption} />) : undefined} />
          {caption && <span className={f.anLabel} aria-hidden="true">{caption.split(" · ")[0]}</span>}
        </div>
      </div>;
    })}
    {t("note") && <p className={`${f.anNote} ${s.reveal}`} data-on={resting} aria-hidden={!resting}>{edit("note", <RichLines text={t("note")} />)}</p>}
  </div>;
}

/* -------------------------------------------------------------- titel */

export function Title({ t, edit, still, horizonY }: FormProps) {
  const series = seriesOf(t);
  return <>
    <div className={f.titleLockup}>
      <p className={s.kicker}>{edit("series")}<span className={s.kickerRule} />{edit("filmLabel")}</p>
      <h2>{edit("filmTitle", <RichLines text={t("filmTitle")} />)}</h2>
      {t("speaker") && <div className={s.speaker}><strong>{edit("speaker")}</strong><span className={s.plain}>{edit("speakerRole", <RichLines text={t("speakerRole")} />)}</span></div>}
    </div>
    {t("puzzle") && <PuzzleGhost still={still} />}
    {series.films > 0 && <SeriesLights film={series.film} films={series.films} next={series.next} horizonY={horizonY} still={still} />}
  </>;
}
