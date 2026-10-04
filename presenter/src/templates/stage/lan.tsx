"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { RichLines, SeriesLights, seriesOf } from "./kit";
import { Kicker, type FormProps } from "./forms";
import s from "./stage.module.css";
import l from "./lan.module.css";

/**
 * Stage · former lånade från de senaste föreläsningarna
 * (28 september 2026): genvägen och detektorn, EPA-insättningen,
 * videoväggen, människoorden, verben och eftertexten ur
 * ”Vem skrev din kurs?” och linsen. Handlingen är lånad; formen är
 * Vätterljusets. Allt innehåll är fält (stage-forms.ts). Koordinater på 1600 × 900.
 * 1 oktober 2026: gapet, ur MatteusGap, och den
 * taggiga gränsen, ur JaggedReveal.
 */

const px = (value: number) => `${Math.round(value)}px`;
const range = (max: number) => Array.from({ length: max }, (_, i) => i + 1);
const list = (value: string) => value.split("|").map(part => part.trim()).filter(Boolean);

/** Ett ord i en mening som kan tändas (människoorden). Ordet måste stå ordagrant. */
function Lit({ text, word, lit }: { text: string; word: string; lit: boolean }) {
  const at = word ? text.indexOf(word) : -1;
  if (at < 0) return <>{text}</>;
  return <>{text.slice(0, at)}<span className={l.litWord} data-lit={lit}>{word}</span>{text.slice(at + word.length)}</>;
}

/* ------------------------------------------------------------- genvägen */

/**
 * Genvägen över vattnet (automation-shortcut). Uppgiften står på
 * stranden och elevens arbete längs vattnet. Nästa klick: AI:s genväg flyger i
 * en båge över arbetet till ett färdigt svar, och arbetet dämpas. Sist frågan.
 */
export function Genvag({ t, edit, step }: FormProps) {
  const works = range(3).filter(n => t(`work${n}`));
  const short = step >= 1;
  const resting = Boolean(t("note")) && step >= 2;
  return <div className={l.genvag} data-short={short} data-resting={resting}>
    <header className={l.head}>
      <Kicker t={t} edit={edit} />
      <h2>{edit("title", <RichLines text={t("title")} />)}</h2>
    </header>
    <svg className={l.gvLines} viewBox="0 0 1600 900" aria-hidden="true">
      <path className={l.gvWalk} d="M 350 560 C 430 600 470 612 560 612 L 1080 612 C 1160 612 1200 600 1250 560" />
      <path className={l.gvArc} d="M 350 440 Q 800 40 1250 440" pathLength={1} />
    </svg>
    <article className={l.gvTask}>
      <small><i className={s.humanDot} />{edit("taskLabel")}</small>
      <p>{edit("task", <RichLines text={t("task")} />)}</p>
    </article>
    <p className={l.gvPathLabel}><i className={s.humanDot} />{edit("pathLabel")}</p>
    {works.map((n, i) => <div key={n} className={l.gvWork} style={{ "--x": px(560 + i * 260), "--i": i } as CSSProperties}>
      <b>{i + 1}</b><span>{edit(`work${n}`, <RichLines text={t(`work${n}`)} />)}</span>
    </div>)}
    <p className={`${l.gvAiLabel} ${s.reveal}`} data-on={short} aria-hidden={!short}><i className={s.aiDot} />{edit("aiLabel")}</p>
    <article className={`${l.gvResult} ${s.reveal}`} data-on={short} aria-hidden={!short}>
      <small><i className={s.aiDot} />{edit("resultLabel")}</small>
      <p>{edit("result", <RichLines text={t("result")} />)}</p>
    </article>
    {t("note") && <h2 className={`${l.gvNote} ${s.reveal}`} data-on={resting} aria-hidden={!resting}>{edit("note", <RichLines text={t("note")} emphasis={t("emphasis")} />)}</h2>}
  </div>;
}

/* ------------------------------------------------------------ detektorn */

/**
 * Detektorn (lånad ur en annan föreläsning). Elevens text på papper → en påhittad
 * detektor säger en siffra → lärarens reaktion och begreppet → forskningen och
 * myndighetens mening, medan papperet och siffran dämpas.
 */
export function Detektor({ t, edit, step }: FormProps) {
  const value = Math.max(0, Math.min(100, Number(t("value").replace(",", ".")) || 0));
  return <div className={l.detektor} data-step={Math.min(step, 3)}>
    <header className={l.head}>
      <Kicker t={t} edit={edit} />
      <h2>{edit("title", <RichLines text={t("title")} />)}</h2>
    </header>
    <article className={l.dtPaper}>
      <small>{edit("contextLabel")}</small>
      <p>{edit("context", <RichLines text={t("context")} />)}</p>
    </article>
    <aside className={`${l.dtTool} ${s.reveal}`} data-on={step >= 1} aria-hidden={step < 1}>
      <small>{edit("toolLabel")}</small>
      <p className={l.dtValue}>{edit("value")}<span>%</span></p>
      <i className={l.dtBar} style={{ "--v": value / 100 } as CSSProperties} aria-hidden="true" />
      <p className={l.dtVerdict}>{edit("verdict")}</p>
    </aside>
    <div className={`${l.dtReaction} ${s.reveal}`} data-on={step === 2} aria-hidden={step !== 2}>
      <blockquote>{edit("reaction", <RichLines text={t("reaction")} />)}</blockquote>
      <p><strong>{edit("concept")}</strong><span>{edit("explanation", <RichLines text={t("explanation")} />)}</span></p>
    </div>
    <div className={`${l.dtResearch} ${s.reveal}`} data-on={step >= 3} aria-hidden={step < 3}>
      <p className={l.dtFocus}>{edit("focus", <RichLines text={t("focus")} />)}</p>
      <p className={l.dtDetail}>{edit("detail", <RichLines text={t("detail")} />)}</p>
      <blockquote className={l.dtQuote}>{edit("quote", <RichLines text={t("quote")} emphasis={t("emphasis")} />)}<cite>{edit("quoteSource")}</cite></blockquote>
    </div>
  </div>;
}

/* ------------------------------------------------------- EPA → ECPA */

/**
 * En modell som får ett led till (epa-insertion). Bokstäverna står på
 * horisonten. Nästa klick skjuts de isär och det nya ledet stiger ur vattnet
 * där det ska in. Sist slutraden medan bokstäverna dämpas.
 */
export function Insattning({ t, edit, step }: FormProps) {
  const letters = range(4).filter(n => t(`letter${n}`));
  const insert = Math.max(1, Math.min(letters.length, Number(t("insert")) || 2));
  const opened = step >= 1;
  const resting = Boolean(t("note")) && step >= 2;
  const before = letters.filter((_, i) => i + 1 !== insert);
  const slot = (n: number) => {
    const i = letters.indexOf(n);
    if (opened) return 312 + i * 325;
    const j = before.indexOf(n);
    return j < 0 ? 312 + i * 325 : 367 + j * 433;
  };
  return <div className={l.insattning} data-opened={opened} data-resting={resting}>
    <header className={l.head}>
      <Kicker t={t} edit={edit} />
    </header>
    {letters.map((n, i) => {
      const inserted = i + 1 === insert;
      const shown = !inserted || opened;
      return <div key={n} className={l.insLetter} data-role={t(`role${n}`) || "human"} data-inserted={inserted || undefined} data-on={shown} aria-hidden={!shown}
        style={{ "--x": px(slot(n)) } as CSSProperties}>
        <strong>{edit(`letter${n}`)}</strong>
        <small>{edit(`name${n}`)}</small>
        <p>{edit(`detail${n}`, <RichLines text={t(`detail${n}`)} />)}</p>
      </div>;
    })}
    {t("note") && <h2 className={`${l.insNote} ${s.reveal}`} data-on={resting} aria-hidden={!resting}>{edit("note", <RichLines text={t("note")} emphasis={t("emphasis")} />)}</h2>}
  </div>;
}

/* ----------------------------------------------------------- videoväggen */

function Loop({ src, alt, play }: { src: string; alt: string; play: boolean }) {
  const video = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const clip = video.current;
    if (!clip) return;
    if (play && !matchMedia("(prefers-reduced-motion: reduce)").matches) void clip.play().catch(() => {});
    else clip.pause();
  }, [play]);
  return <video ref={video} src={src} muted loop playsInline preload="auto" aria-label={alt} />;
}

/**
 * Videoväggen (Joels slide ”Allt detta är AI.” i en föreläsning). Tysta klipp i
 * ett rutnät som kunde ha varit sanna. Nästa klick: vinjetten och rubriken
 * faller in, och varje ruta märks. Ingen märkning före dess, så poängen inte röjs.
 */
export function Vagg({ t, edit, step, still }: FormProps) {
  const clips = range(6).filter(n => t(`media${n}`));
  const titled = step >= 1;
  const resting = Boolean(t("note")) && step >= 2;
  return <div className={l.vagg} data-count={clips.length} data-titled={titled}>
    <div className={l.vgGrid}>
      {clips.map((n, i) => <figure key={n} className={l.vgCell} style={{ "--i": i } as CSSProperties}>
        {/\.(mp4|webm|mov)$/i.test(t(`media${n}`)) ? <Loop src={t(`media${n}`)} alt={t(`alt${n}`)} play={!still} /> : <img src={t(`media${n}`)} alt={t(`alt${n}`)} />}
        <figcaption className={`${l.vgTag} ${s.reveal}`} data-on={titled} aria-hidden={!titled}>{edit(`caption${n}`)}</figcaption>
      </figure>)}
    </div>
    <div className={l.vgVeil} data-on={titled} aria-hidden="true" />
    <div className={l.vgTitle} data-on={titled} aria-hidden={!titled}>
      <Kicker t={t} edit={edit} />
      <h2>{edit("title", <RichLines text={t("title")} emphasis={t("emphasis")} />)}</h2>
      {t("caption") && <p>{edit("caption", <RichLines text={t("caption")} />)}</p>}
    </div>
    {t("note") && <p className={`${l.vgNote} ${s.reveal}`} data-on={resting} aria-hidden={!resting}>{edit("note", <RichLines text={t("note")} />)}</p>}
  </div>;
}

/* ----------------------------------------------------------- människoorden */

/**
 * ”Hörde ni?” (Vem skrev din kurs?). Seriens egna meningar står som de stod.
 * Nästa klick: människoorden i dem tänds och byter från maskinens färg till
 * människans. Sist slutraden medan meningarna dämpas.
 */
export function Ord({ t, edit, step }: FormProps) {
  const lines = range(4).filter(n => t(`line${n}`));
  const lit = step >= 1;
  const final = Boolean(t("title")) && step >= 2;
  return <div className={l.ord} data-lit={lit} data-final={final}>
    <header className={l.ordHead}><Kicker t={t} edit={edit} /></header>
    <ol className={l.ordLines}>
      {lines.map((n, i) => <li key={n} style={{ "--i": i } as CSSProperties}>
        <p>{edit(`line${n}`, <Lit text={t(`line${n}`)} word={t(`word${n}`)} lit={lit} />)}</p>
        <small>{edit(`source${n}`)}</small>
      </li>)}
    </ol>
    {t("wordsLabel") && <p className={`${l.ordLabel} ${s.reveal}`} data-on={lit && !final} aria-hidden={!lit || final}>{edit("wordsLabel", <RichLines text={t("wordsLabel")} />)}</p>}
    {t("title") && <h2 className={`${l.ordFinal} ${s.reveal}`} data-on={final} aria-hidden={!final}>{edit("title", <RichLines text={t("title")} emphasis={t("emphasis")} />)}</h2>}
  </div>;
}

/* ---------------------------------------------------------------- verben */

/**
 * Vem får verben? (Vem skrev din kurs?). En rad skyltar för AI med verb som gör
 * något, en rad för eleverna där något händer dem. Nästa klick: raderna byter
 * plats och verben byter form, skylt för skylt. Sist en fråga.
 */
export function Verben({ t, edit, step, still }: FormProps) {
  const a = list(t("verbsA")), b = list(t("verbsB")), a2 = list(t("swapA")), b2 = list(t("swapB"));
  const showB = step >= 1;
  const swapped = step >= 2;
  const final = Boolean(t("final")) && step >= 3;
  const rows = [
    { key: "A", label: "rowA", verbs: swapped && a2.length ? a2 : a, field: swapped && a2.length ? "swapA" : "verbsA", role: swapped ? "passive" : "ai", top: swapped ? 1 : 0, on: true },
    { key: "B", label: "rowB", verbs: swapped && b2.length ? b2 : b, field: swapped && b2.length ? "swapB" : "verbsB", role: swapped ? "human" : "passive", top: swapped ? 0 : 1, on: showB },
  ];
  return <div className={l.verben} data-swapped={swapped} data-final={final} data-still={still}>
    <header className={l.head}>
      <Kicker t={t} edit={edit} />
      <h2>{edit("title", <RichLines text={t("title")} />)}</h2>
    </header>
    {rows.map(row => <section key={row.key} className={l.vbRow} data-role={row.role} data-on={row.on} aria-hidden={!row.on} style={{ "--row": row.top } as CSSProperties}>
      <p className={l.vbLabel}>{edit(row.label)}</p>
      {edit(row.field, <ul>{row.verbs.map((verb, i) => <li key={`${row.field}-${i}`} style={{ "--i": i } as CSSProperties}>{verb}</li>)}</ul>)}
    </section>)}
    {t("final") && <h2 className={`${l.vbFinal} ${s.reveal}`} data-on={final} aria-hidden={!final}>{edit("final", <RichLines text={t("final")} emphasis={t("emphasis")} />)}</h2>}
  </div>;
}

/* ------------------------------------------------------------- eftertexten */

/**
 * Eftertexten (Vem skrev din kurs?, den sjunde berättelsen). Seriens namn och en
 * titel; sedan en roll per klick. En roll utan namn får en tom rad att skriva på.
 */
export function Eftertext({ t, edit, step, still, horizonY }: FormProps) {
  const roles = range(4).filter(n => t(`role${n}`));
  const { films } = seriesOf(t);
  // Den femte filmen: ett ljus till tänds närmare, på det klick som fältet fifth anger.
  const fifthAt = t("fifth").trim() === "" ? -1 : Math.max(0, Math.round(Number(t("fifth")) || 0));
  return <>
    <div className={l.eftertext}>
      <Kicker t={t} edit={edit} />
      <h2 className={l.etTitle}>{edit("title", <RichLines text={t("title")} />)}</h2>
      <dl className={l.etRoles}>
        {roles.map((n, i) => <div key={n} className={s.reveal} data-on={step >= i + 1} aria-hidden={step < i + 1}>
          <dt>{edit(`role${n}`)}</dt>
          <dd data-blank={!t(`credit${n}`) || undefined}>{t(`credit${n}`) ? edit(`credit${n}`) : <i aria-label="Tom rad att fylla i" />}</dd>
        </div>)}
      </dl>
      {t("foot") && <p className={l.etFoot}>{edit("foot", <RichLines text={t("foot")} />)}</p>}
    </div>
    {films > 0 && <SeriesLights films={films} fifth={fifthAt < 0 ? undefined : step >= fifthAt} horizonY={horizonY} still={still} />}
  </>;
}

/* ---------------------------------------------------------------- linsen */

/**
 * Linsen (bus_return). Rösten står kvar som referens med AI:ns dom. Tre
 * frågor, en i taget, med svaret under; de föregående dämpas. Sist slutraden.
 */
export function Lins({ t, edit, step }: FormProps) {
  const questions = range(3).filter(n => t(`focus${n}`));
  const noteStep = questions.length;
  const resting = Boolean(t("note")) && step >= noteStep;
  return <div className={l.lins} data-resting={resting}>
    <header className={l.head}>
      <Kicker t={t} edit={edit} />
      <h2>{edit("title", <RichLines text={t("title")} />)}</h2>
    </header>
    <figure className={l.lnRef}>
      <figcaption>{edit("contextLabel")}</figcaption>
      <blockquote>{edit("context", <RichLines text={t("context")} />)}</blockquote>
      {t("answer") && <p className={l.lnVerdict}><i className={s.aiDot} />{edit("answer")}</p>}
    </figure>
    <ol className={l.lnQuestions}>
      {questions.map((n, i) => <li key={n} className={s.reveal} data-on={step >= i} data-current={step === i} aria-hidden={step < i}>
        <h3>{edit(`focus${n}`, <RichLines text={t(`focus${n}`)} />)}</h3>
        <p>{edit(`detail${n}`, <RichLines text={t(`detail${n}`)} />)}</p>
      </li>)}
    </ol>
    {t("note") && <h2 className={`${l.lnNote} ${s.reveal}`} data-on={resting} aria-hidden={!resting}>{edit("note", <RichLines text={t("note")} emphasis={t("emphasis")} />)}</h2>}
  </div>;
}

/* ---------------------------------------------------------------- gapet */

/*
 * Banorna i scenens koordinater. Båda börjar i ljuset (light 14 % = x 224) och
 * slutar vid x 1060, med texterna till höger. Den nedre banan och dess lyft
 * delar första segmentet, och vid förgreningen har de samma riktning, så att
 * lyftet växer ur banan. Öppen och sluten form har samma kommandon, så att d kan glida.
 */
type Pt = readonly [number, number];
const pt = (p: Pt) => p.join(" ");
const GP_START: Pt = [224, 708], GP_BRANCH: Pt = [640, 680], GP_LOW: Pt = [1060, 650], GP_UP: Pt = [1060, 330], GP_LIFT: Pt = [1060, 372];
const GP_SEG1 = `C 360 706 500 692 ${pt(GP_BRANCH)}`;
const GP_SEG2 = `C 780 668 920 656 ${pt(GP_LOW)}`;
const GP_RISE = `C 780 668 900 440 ${pt(GP_LIFT)}`;
const GP_UPPER = `M ${pt(GP_START)} C 440 704 610 662 760 570 C 900 482 985 372 ${pt(GP_UP)}`;
const GP_LOWER = `M ${pt(GP_START)} ${GP_SEG1} ${GP_SEG2}`;
const GP_LIFTED = `M ${pt(GP_START)} ${GP_SEG1} ${GP_RISE}`;
const GP_GHOST = `M ${pt(GP_BRANCH)} ${GP_SEG2}`;
// Ytan mellan banorna: ut längs den övre, tillbaka längs den nedre (eller lyftet).
const GP_BACK = `C 500 692 360 706 ${pt(GP_START)} Z`;
const GP_AREA_OPEN = `${GP_UPPER} L ${pt(GP_LOW)} C 920 656 780 668 ${pt(GP_BRANCH)} ${GP_BACK}`;
const GP_AREA_CLOSED = `${GP_UPPER} L ${pt(GP_LIFT)} C 900 440 780 668 ${pt(GP_BRANCH)} ${GP_BACK}`;
const along = (d: string) => ({ offsetPath: `path("${d}")` }) as CSSProperties;
const shape = (d: string) => ({ d: `path("${d}")` }) as CSSProperties;
const at = (p: Pt) => ({ "--x": px(p[0]), "--y": px(p[1]) }) as CSSProperties;

/**
 * Gapet (MatteusGap, 1 oktober 2026). Två
 * banor från samma ljus. Den övre tecknas när sliden kommer. Den nedre tecknas
 * på nästa klick och planar ut, och ytan mellan dem blir gapet. Med slutsatsen
 * vänder den nedre banan uppåt där eleven får lära sig välja, och gapet sluts.
 * Dit den var på väg står kvar streckat. Banorna tecknas i stället för att dyka
 * upp, eftersom gapet uppstår över tid. Schematiskt: inga axlar och inga tal.
 * closes="nej" låter gapet stå kvar vid slutsatsen.
 */
export function Gapet({ t, edit, step, still }: FormProps) {
  const lower = step >= 1;
  const resting = Boolean(t("note")) && step >= 2;
  const closes = resting && t("closes").trim().toLowerCase() !== "nej";
  const lowerPath = closes ? GP_LIFTED : GP_LOWER;
  const area = closes ? GP_AREA_CLOSED : GP_AREA_OPEN;
  return <div className={l.gapet} data-step={Math.min(step, 2)} data-still={still} data-lower={lower} data-resting={resting} data-closes={closes}>
    <header className={l.head}>
      <Kicker t={t} edit={edit} />
      {t("title") && <h2>{edit("title", <RichLines text={t("title")} />)}</h2>}
    </header>
    <svg className={l.gpPlot} viewBox="0 0 1600 900" aria-hidden="true">
      <path className={l.gpArea} d={area} style={shape(area)} />
      <path className={l.gpGhost} d={GP_GHOST} />
      <path className={l.gpUpper} d={GP_UPPER} pathLength={1} />
      <path className={l.gpLower} d={lowerPath} pathLength={1} style={shape(lowerPath)} />
    </svg>
    <i className={`${l.gpMark} ${l.gpStart}`} style={at(GP_START)} aria-hidden="true" />
    <i className={`${l.gpMark} ${l.gpBranch}`} style={at(GP_BRANCH)} aria-hidden="true" />
    <i className={`${l.gpDot} ${l.gpUpperDot}`} style={along(GP_UPPER)} aria-hidden="true" />
    {/* Den nedre punkten följer banan ut och lyfts sedan med banans ände: samma glidning som d. */}
    <span className={l.gpRide} style={{ "--gp-lift": px(GP_LIFT[1] - GP_LOW[1]) } as CSSProperties} aria-hidden="true">
      <i className={`${l.gpDot} ${l.gpLowerDot}`} style={along(GP_LOWER)} />
    </span>
    {t("startLabel") && <p className={l.gpStartLabel}>{edit("startLabel")}</p>}
    <article className={`${l.gpSide} ${l.gpUp}`}>
      <small><i aria-hidden="true" />{edit("upperLabel")}</small>
      <p>{edit("upperText", <RichLines text={t("upperText")} />)}</p>
    </article>
    <article className={`${l.gpSide} ${l.gpLow} ${s.reveal}`} data-on={lower} aria-hidden={!lower}>
      <small><i aria-hidden="true" />{edit("lowerLabel")}</small>
      <p>{edit("lowerText", <RichLines text={t("lowerText")} />)}</p>
    </article>
    {t("gapLabel") && <p className={`${l.gpGapLabel} ${s.reveal}`} data-on={lower && !closes} aria-hidden={!lower || closes}>{edit("gapLabel")}</p>}
    {t("note") && <h2 className={`${l.gpNote} ${s.reveal}`} data-on={resting} aria-hidden={!resting}>{edit("note", <RichLines text={t("note")} emphasis={t("emphasis")} />)}</h2>}
  </div>;
}

/* --------------------------------------------------------------- taggig */

/*
 * Gränsen som en taggig bergsrygg över sjön. Samma punkter före och efter
 * flytten, så att d kan glida. Toppen och dalen är de två uppgifterna; övriga
 * taggar är schematiska. Ryggen börjar och slutar utanför bild, så att
 * gränsen fortsätter åt båda hållen. Texterna står ovanför ryggen och
 * slutsatsen till vänster om toppen (x 96–576), där ryggen ligger under y 490.
 */
const TG_BEFORE: Pt[] = [[-20, 610], [60, 586], [130, 622], [200, 560], [270, 598], [340, 548], [410, 590], [480, 536], [550, 572], [600, 450], [640, 170], [690, 500], [740, 566],
  [810, 528], [880, 590], [950, 548], [1020, 600], [1080, 572], [1150, 700], [1220, 584], [1290, 548], [1360, 596], [1430, 540], [1500, 586], [1570, 552], [1620, 580]];
// Efter flytten: allt högre, dalen mest (det som blev fel kan bli rätt), men ryggen är fortfarande taggig.
const TG_AFTER: Pt[] = [[-20, 566], [60, 552], [130, 572], [200, 520], [270, 548], [340, 500], [410, 548], [480, 494], [550, 520], [600, 400], [640, 120], [690, 452], [740, 520],
  [810, 480], [880, 548], [950, 500], [1020, 552], [1080, 520], [1150, 600], [1220, 528], [1290, 500], [1360, 548], [1430, 486], [1500, 540], [1570, 500], [1620, 530]];
const TG_PEAK = 10, TG_DIP = 18;
const ridge = (points: readonly Pt[]) => `M ${points.map(pt).join(" L ")}`;
const lengthTo = (points: readonly Pt[], end: number) => points.slice(1, end + 1).reduce((sum, p, i) => sum + Math.hypot(p[0] - points[i][0], p[1] - points[i][1]), 0);
const TG_RIDGE_BEFORE = ridge(TG_BEFORE), TG_RIDGE_AFTER = ridge(TG_AFTER);
/** Hur stor del av ryggen som är tecknad när toppen nås (läge 0). */
const TG_PEAK_AT = lengthTo(TG_BEFORE, TG_PEAK) / lengthTo(TG_BEFORE, TG_BEFORE.length - 1);

/**
 * Den taggiga gränsen (JaggedReveal, 1 oktober 2026). När sliden kommer tecknas
 * gränsen från vänster upp till toppen, där det AI klarar står stort. Nästa
 * klick: texten krymper, gränsen fortsätter ned i en djup dal och föremålet
 * (skolklockan) faller ned i dalen med det AI klarar sämre. Med slutsatsen
 * flyttar sig gränsen, och den gamla står kvar streckad. moves="nej" låter den
 * stå still. Schematiskt: höjderna är inga mätvärden.
 */
export function Taggig({ t, edit, step, still }: FormProps) {
  const dip = step >= 1;
  const resting = Boolean(t("note")) && step >= 2;
  const moves = resting && t("moves").trim().toLowerCase() !== "nej";
  const path = moves ? TG_RIDGE_AFTER : TG_RIDGE_BEFORE;
  return <div className={l.taggig} data-step={Math.min(step, 2)} data-still={still} data-dip={dip} data-resting={resting} data-moves={moves}
    style={{ "--tg-off": dip ? 0 : Number((1 - TG_PEAK_AT).toFixed(4)), "--tg-rise": px(TG_AFTER[TG_PEAK][1] - TG_BEFORE[TG_PEAK][1]) } as CSSProperties}>
    <header className={l.head}><Kicker t={t} edit={edit} /></header>
    <svg className={l.tgPlot} viewBox="0 0 1600 900" aria-hidden="true">
      <path className={l.tgGhost} d={TG_RIDGE_BEFORE} />
      <path className={l.tgLine} d={path} pathLength={1} style={shape(path)} />
    </svg>
    <i className={l.tgPeakDot} style={at(TG_BEFORE[TG_PEAK])} aria-hidden="true" />
    <article className={`${l.tgSide} ${l.tgHigh}`}>
      <small><i aria-hidden="true" />{edit("peakLabel")}</small>
      <p>{edit("peakText", <RichLines text={t("peakText")} className={l.tgLines} />)}</p>
    </article>
    {t("image") && <img className={l.tgObject} src={t("image")} alt={t("imageAlt")} style={at(TG_BEFORE[TG_DIP])} />}
    <article className={`${l.tgSide} ${l.tgLow} ${s.reveal}`} data-on={dip} aria-hidden={!dip}>
      <small><i aria-hidden="true" />{edit("dipLabel")}</small>
      <p>{edit("dipText", <RichLines text={t("dipText")} className={l.tgLines} />)}</p>
    </article>
    {t("note") && <h2 className={`${l.tgNote} ${s.reveal}`} data-on={resting} aria-hidden={!resting}>{edit("note", <RichLines text={t("note")} emphasis={t("emphasis")} />)}</h2>}
  </div>;
}

export type LanForm = (props: FormProps) => ReactNode;
