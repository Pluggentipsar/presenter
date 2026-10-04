"use client";

/* eslint-disable @next/next/no-img-element */
import type { CSSProperties } from "react";
import { RichLines } from "./kit";
import { CountUp, Kicker, type FormProps } from "./forms";
import s from "./stage.module.css";
import r from "./rorelse.module.css";

/**
 * Stage · rörelsepasset (28 september 2026): former där
 * rörelsen bär förklaringen. Kranen (ett agensförlopp ur en föreläsning), lateral läsning
 * och poängtavlan. Allt innehåll är fält (stage-forms.ts). Koordinater på
 * 1600 × 900; nödvändig text slutar ovanför y 745 (textningsmarginalen).
 */

const range = (max: number) => Array.from({ length: max }, (_, i) => i + 1);

/** Stegen i en form där varje led kan saknas: ledets namn → klicket det kommer på (−1 = saknas). */
function stepPlan(t: FormProps["t"], keys: string[]): Record<string, number> {
  let next = 1;
  return Object.fromEntries(keys.map(key => [key, t(key) ? next++ : -1]));
}

/* ------------------------------------------------------------------ kranen */

/**
 * Intelligens på kran (ett agensförlopp ur en föreläsning, lim_motion_agency). Kranen står
 * kvar genom hela scenen. Förmågorna rinner ur den i AI:s färg och breder ut
 * sig på vattnet. Sedan stiger AGENS ur horisontens ljus, människans ljus, och
 * INTELLIGENS sjunker. Sist verktyget vid kranen och agensen vid ljuset.
 */
export function Kran({ t, edit, step }: FormProps) {
  const flows = range(4).filter(n => t(`flow${n}`));
  const at = stepPlan(t, [flows.length ? "flow1" : "", "thesis", "tool", "practice"].map(key => key || "_none"));
  const on = (key: string) => at[key] >= 0 && step >= at[key];
  const flowing = flows.length > 0 && on("flow1");
  const thesis = on("thesis") && !on("tool");
  const phase = on("practice") ? "practice" : on("tool") ? "tool" : on("thesis") ? "thesis" : flowing ? "flow" : "tap";
  return <div className={r.kran} data-phase={phase}>
    <header className={r.krHead}><Kicker t={t} edit={edit} /></header>
    <figure className={r.krTap}>
      {t("image") && <img src={t("image")} alt={t("imageAlt")} />}
    </figure>
    <svg className={r.krStream} viewBox="0 0 1600 900" aria-hidden="true" data-on={flowing}>
      <defs>
        <linearGradient id="krFall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--kr-ai)" stopOpacity=".95" />
          <stop offset="1" stopColor="var(--kr-ai)" stopOpacity=".55" />
        </linearGradient>
      </defs>
      <path className={r.krFall} d="M 132 432 C 134 520 140 610 152 664" pathLength={1} />
      <path className={r.krSpread} d="M 152 668 C 330 676 620 686 1000 694" pathLength={1} />
    </svg>
    <ol className={r.krFlow} aria-label={flows.map(n => t(`flow${n}`)).join(" ")}>
      {flows.map((n, i) => <li key={n} data-on={flowing} style={{ "--i": i } as CSSProperties}>
        <i className={s.aiDot} />{edit(`flow${n}`)}
      </li>)}
    </ol>
    <h2 className={`${r.krTitle} ${s.reveal}`} data-on={!on("thesis")} aria-hidden={on("thesis")}>{edit("title", <RichLines text={t("title")} />)}</h2>
    {t("thesis") && <h2 className={r.krThesis} data-on={thesis} aria-hidden={!thesis}>{edit("thesis", <RichLines text={t("thesis")} emphasis={t("emphasis")} className={r.krLines} />)}</h2>}
    {t("tool") && <p className={`${r.krTool} ${s.reveal}`} data-on={on("tool")} data-dim={on("practice")} aria-hidden={!on("tool")}>{edit("tool", <RichLines text={t("tool")} />)}</p>}
    {t("practice") && <p className={`${r.krPractice} ${s.reveal}`} data-on={on("practice")} aria-hidden={!on("practice")}>{edit("practice", <RichLines text={t("practice")} />)}</p>}
  </div>;
}

/* ------------------------------------------------------- lateral läsning */

/**
 * Pilarna från sidans högra kant till flikarna, i scenens koordinater. I bildläget talare slutar sidan vid
 * x 506 och flikarna börjar vid x 620; i full (rorelse.module.css) vid x 650 och x 770.
 */
const LATERAL_ARROWS = {
  talare: ["M 512 290 C 560 272 588 236 612 212", "M 512 400 C 560 410 588 428 612 440"],
  full: ["M 656 290 C 700 272 732 240 762 216", "M 656 400 C 700 412 732 432 762 456"],
} as const;

/**
 * Lateral läsning. En obekant sida (illustration) → sidan glider undan och två
 * nya flikar öppnas i sidled: omdömet kommer utifrån. Sedan en fråga till
 * chatten och, på nästa klick, svaret som böjer tillbaka in i sig självt i en
 * cirkel: inget nytt belägg. Prompt och svar får var sitt klick. Bildläget full
 * breder ut samma förlopp över hela bilden.
 */
export function Lateral({ t, edit, step, layout }: FormProps) {
  const tabs = [1, 2].filter(n => t(`tab${n}`));
  const at = stepPlan(t, ["leftText", "ask", "reply"]);
  const on = (key: string) => at[key] >= 0 && step >= at[key];
  const lateral = on("leftText");
  const chat = on("ask");
  const arrows = LATERAL_ARROWS[layout === "full" ? "full" : "talare"];
  return <div className={r.lateral} data-lateral={lateral} data-chat={chat}>
    <header className={r.laHead}><Kicker t={t} edit={edit} /></header>
    <div className={r.laStage}>
      <figure className={r.laPage}>
        <div className={r.laBar}><i /><i /><i /><span>{edit("pageUrl")}</span></div>
        <div className={r.laBody}>
          {t("pageLabel") && <small>{edit("pageLabel")}</small>}
          <h3>{edit("pageTitle", <RichLines text={t("pageTitle")} />)}</h3>
          <p aria-hidden="true"><i style={{ width: "92%" }} /><i style={{ width: "84%" }} /><i style={{ width: "88%" }} /><i style={{ width: "52%" }} /></p>
          <p aria-hidden="true"><i style={{ width: "90%" }} /><i style={{ width: "76%" }} /></p>
        </div>
      </figure>
      {tabs.map((n, i) => <figure key={n} className={r.laTab} data-on={lateral} style={{ "--i": i } as CSSProperties} aria-hidden={!lateral}>
        <div className={r.laBar}><i /><i /><i /><span /></div>
        <div className={r.laTabBody}>
          <h4><i className={s.humanDot} />{edit(`tab${n}`)}</h4>
          <p aria-hidden="true"><i style={{ width: "86%" }} /><i style={{ width: "64%" }} /></p>
        </div>
      </figure>)}
      <svg className={r.laArrows} viewBox="0 0 1600 900" aria-hidden="true" data-on={lateral}>
        {arrows.map(d => <path key={d} d={d} pathLength={1} />)}
      </svg>
      {t("leftText") && <p className={`${r.laText} ${s.reveal}`} data-on={lateral && !chat} aria-hidden={!lateral || chat}>
        {t("leftLabel") && <small>{edit("leftLabel")}</small>}
        {edit("leftText", <RichLines text={t("leftText")} />)}
      </p>}
    </div>
    <section className={r.laChat} data-on={chat} aria-hidden={!chat}>
      {t("chatLabel") && <p className={r.laChatLabel}><i className={s.aiDot} />{edit("chatLabel")}</p>}
      <div className={`${r.laAsk} ${s.reveal}`} data-on={chat}><small>{t("askLabel") ? edit("askLabel") : "Du"}</small><p>{edit("ask")}</p></div>
      <div className={`${r.laReply} ${s.reveal}`} data-on={on("reply")} aria-hidden={!on("reply")}><small><i className={s.aiDot} />{t("replyLabel") ? edit("replyLabel") : "AI"}</small><p>{edit("reply")}</p></div>
      <svg className={r.laLoop} viewBox="0 0 220 220" aria-hidden="true" data-on={on("reply")}>
        <path d="M 110 22 A 88 88 0 1 1 30 70" pathLength={1} />
        <path className={r.laLoopHead} d="M 11.7 82.1 L 30 70 L 31.3 92" />
      </svg>
      {t("note") && <p className={`${r.laNote} ${s.reveal}`} data-on={on("reply")} aria-hidden={!on("reply")}>{edit("note", <RichLines text={t("note")} emphasis={t("emphasis")} />)}</p>}
    </section>
  </div>;
}

/* ------------------------------------------------------------- poängtavlan */

/**
 * Därför lönar det sig att gissa (Kalai m.fl. 2025, som räkneexempel). Först
 * reglerna. Nästa klick: två provskrivare på samma prov, som kan lika många
 * svar. Den ena skriver ”vet inte”, den andra gissar och får en rätt av en
 * slump. Rutorna fylls, räknarna går och gissaren kliver förbi. Sist slutsatsen.
 */
export function Poang({ t, edit, step, still }: FormProps) {
  const rules = range(3).filter(n => t(`value${n}`) || t(`label${n}`));
  const total = Math.max(2, Math.min(12, Number(t("questions")) || 10));
  const known = Math.max(0, Math.min(total - 1, Number(t("known")) || 7));
  const lucky = Math.max(0, Math.min(total - known, Number(t("lucky")) || 1));
  const test = step >= 1;
  const resting = Boolean(t("note")) && step >= 2;
  const cells = (guess: boolean) => Array.from({ length: total }, (_, i) => i < known ? "right" : !guess ? "blank" : i < known + lucky ? "lucky" : "wrong");
  const rows = [
    { key: "A", label: "rowALabel", cells: cells(false), score: known },
    { key: "B", label: "rowBLabel", cells: cells(true), score: known + lucky },
  ];
  return <div className={r.poang} data-test={test} data-resting={resting} data-still={still}>
    <header className={r.poHead}>
      <Kicker t={t} edit={edit} />
      {t("title") && <h2>{edit("title", <RichLines text={t("title")} />)}</h2>}
    </header>
    <dl className={r.poRules}>
      {rules.map(n => <div key={n}><dt>{edit(`value${n}`)}</dt><dd>{edit(`label${n}`, <RichLines text={t(`label${n}`)} />)}</dd></div>)}
    </dl>
    {rows.map((row, ri) => <section key={row.key} className={r.poRow} data-on={test} data-row={row.key} aria-hidden={!test}
      style={{ "--r": ri } as CSSProperties} aria-label={`${t(row.label)}: ${row.score} ${t("pointsLabel") || "poäng"}`}>
      <p className={r.poLabel}>{edit(row.label, <RichLines text={t(row.label)} />)}</p>
      <ol className={r.poCells} aria-hidden="true">
        {row.cells.map((cell, i) => <li key={i} data-cell={cell} style={{ "--c": i } as CSSProperties} />)}
      </ol>
      <p className={r.poScore}><strong><CountUp value={String(row.score)} run={test && !still} /></strong><span>{t("pointsLabel") || "poäng"}</span></p>
    </section>)}
    {t("note") && <h2 className={`${r.poNote} ${s.reveal}`} data-on={resting} aria-hidden={!resting}>{edit("note", <RichLines text={t("note")} emphasis={t("emphasis")} />)}</h2>}
  </div>;
}
