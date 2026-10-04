"use client";

/* eslint-disable @next/next/no-img-element */
import { type CSSProperties, type ReactNode } from "react";
import { Marked, PIECE_H, PIECE_W, RichLines, piecePath, puzzleEdges, seeded } from "./kit";
import { Kicker, type FormProps } from "./forms";
import s from "./stage.module.css";
import x from "./special.module.css";

const list = (value: string) => value.split("|").map(part => part.trim()).filter(Boolean);

/* ------------------------------------------------ en sak till → ett lager */

export function Raster({ t, edit, step }: FormProps) {
  const rows = list(t("rows"));
  return <>
    <div className={x.rasterHead}><Kicker t={t} edit={edit} /></div>
    {edit("rows", <ol className={x.rasterRows} data-step={step}>{rows.map((row, i) => <li key={i} style={{ transitionDelay: step === 1 ? `${i * .05}s` : "0s" }}>{row}</li>)}</ol>)}
    <div className={x.rasterBox} data-step={step}><span>{edit("box")}</span></div>
    <p className={`${x.rasterQ} ${s.reveal}`} data-on={step === 0} aria-hidden={step !== 0}>{edit("q1", <RichLines text={t("q1")} />)}</p>
    <p className={`${x.rasterQ} ${x.rasterQ2} ${s.reveal}`} data-on={step === 1} aria-hidden={step !== 1}>{edit("q2", <RichLines text={t("q2")} />)}</p>
  </>;
}

/* ------------------------------------------------------------- väskan */

export function Tokens({ t, edit, step, still }: FormProps) {
  const sources = list(t("trainSources"));
  const later = list(t("train2"));
  const tokens = list(t("tokens"));
  const tiles = Array.from({ length: 42 }, (_, i) => ({ i, kind: sources[i % Math.max(1, sources.length)] ?? "", x: Math.round(60 + seeded(i + 11) * 1480), y: Math.round(90 + seeded(i + 23) * 640), r: Math.round((seeded(i + 5) - .5) * 30), d: (seeded(i) * .5).toFixed(2) }));
  // Valfria föremål (en föreläsnings version): klockan står med meningen och slutraden, visselpipan med sammanhanget.
  const pictured = Boolean(t("image") || t("image2"));
  const object = step <= 1 || step === 6 ? "image" : step === 5 ? "image2" : "";
  return <>
    <div className={x.tokHead}><Kicker t={t} edit={edit} /></div>
    {["image", "image2"].filter(key => t(key)).map(key => <figure key={key} className={`${x.tokObject} ${s.reveal}`} data-on={object === key} aria-hidden={object !== key}>
      <img src={t(key)} alt={t(`${key}Alt`)} />
    </figure>)}
    <section className={`${x.tokSentence} ${s.reveal}`} data-on={step <= 1} data-pictured={pictured || undefined} aria-hidden={step > 1}>
      <p className={x.tokLabel}><i className={s.humanDot} />Prompt</p>
      <h2>{edit("prompt", <RichLines text={t("prompt")} />)}<span className={x.caret} data-still={still} aria-hidden="true" /></h2>
      <ol className={x.tokCands} data-on={step === 1}>
        {["cand1", "cand2", "cand3"].filter(key => t(key)).map((key, i) => <li key={key} className={s.reveal} data-on={step === 1} style={{ "--tilt": `${[-3, 2, -1][i]}deg`, transitionDelay: step === 1 && !still ? `${.1 + i * .16}s` : "0s" } as CSSProperties}><i className={s.aiDot} />{edit(key)}</li>)}
      </ol>
      {t("candNote") && <p className={`${x.tokCandNote} ${s.reveal}`} data-on={step === 1} aria-hidden={step !== 1} style={{ transitionDelay: step === 1 && !still ? ".7s" : "0s" }}>{edit("candNote", <RichLines text={t("candNote")} />)}</p>}
    </section>
    <section className={x.tokTrain} data-step={step} aria-hidden={step < 2 || step > 3}>
      <div className={x.tiles} aria-hidden="true">{tiles.map(tile => <span key={tile.i} className={x.tile} style={{ "--x": `${tile.x}px`, "--y": `${tile.y}px`, "--r": `${tile.r}deg`, animationDelay: step === 2 && !still ? `${tile.d}s` : "0s" } as CSSProperties}>{tile.kind}</span>)}</div>
      <p className={x.tokSources}>{edit("trainSources", <>{sources.join(" · ")}</>)}</p>
      <h2 className={x.tokWord}>{edit("trainWord")}</h2>
      <ol className={x.tokLater}>{later.map((label, i) => <li key={i} className={s.reveal} data-on={step === 3} style={{ transitionDelay: step === 3 && !still ? `${i * .14}s` : "0s" }}>{label}</li>)}</ol>
    </section>
    <section className={`${x.tokPieces} ${s.reveal}`} data-on={step === 4} aria-hidden={step !== 4}>
      <p className={x.tokLabel}>{edit("tokenLabel", <RichLines text={t("tokenLabel")} />)}</p>
      {edit("tokens", <p className={x.pieces}>{tokens.map((piece, i) => <span key={i} style={{ transitionDelay: step === 4 && !still ? `${.15 + i * .2}s` : "0s" }} data-on={step === 4}>{piece}</span>)}</p>)}
    </section>
    <section className={`${x.tokContext} ${s.reveal}`} data-on={step === 5} data-pictured={pictured || undefined} aria-hidden={step !== 5}>
      <p className={x.tokLabel}><i className={s.humanDot} />Prompt med sammanhang</p>
      <h2>{edit("prompt2", <RichLines text={t("prompt2")} />)}</h2>
      <p className={x.tokAnswer}><i className={s.aiDot} />{edit("answer2")}</p>
    </section>
    <h2 className={`${x.tokFinal} ${s.reveal}`} data-on={step === 6} data-pictured={pictured || undefined} aria-hidden={step !== 6}>{edit("final", <RichLines text={t("final")} />)}</h2>
  </>;
}

/* ------------------------------------------------------------- gymmet */

export function Gym({ t, edit, step }: FormProps) {
  return <>
    <figure className={x.gymStrong} data-step={step}><img src={t("image")} alt={t("imageAlt")} /></figure>
    <figure className={x.gymTruck} data-step={step}><img src={t("image2")} alt={t("image2Alt")} /></figure>
    <div className={x.gymText} data-step={step}>
      <Kicker t={t} edit={edit} />
      <h2 className={`${x.gymQ} ${s.reveal}`} data-on={step === 0} aria-hidden={step !== 0}>{edit("q", <RichLines text={t("q")} />)}</h2>
      <div className={`${x.gymA} ${s.reveal}`} data-on={step === 1} aria-hidden={step !== 1}><p>{edit("a1")}</p><strong>{edit("a1b")}</strong></div>
      <div className={`${x.gymB} ${s.reveal}`} data-on={step === 2} aria-hidden={step !== 2}><p>{edit("a2")}</p><strong>{edit("a2b", <RichLines text={t("a2b")} />)}</strong></div>
      <div className={`${x.gymC} ${s.reveal}`} data-on={step === 3} aria-hidden={step !== 3}><p>{edit("a3", <RichLines text={t("a3")} />)}</p><strong>{edit("a3b")}</strong><em>{edit("a4", <RichLines text={t("a4")} />)}</em></div>
    </div>
  </>;
}

/* ------------------------------------------------------- strömkretsen */

export function Krets({ t, edit, step, still }: FormProps) {
  const r = Number(t("r")) || 3;
  const u1 = Number(t("u1")) || 6;
  const u2 = Number(t("u2")) || u1 * 2;
  const u = step >= 2 ? u2 : u1;
  const i = u / r;
  const fmt = (value: number) => (Math.round(value * 100) / 100).toString().replace(".", ",");
  const loop = "M 250 170 H 650 V 470 H 250 Z";
  return <>
    <div className={x.kretsHead}><Kicker t={t} edit={edit} /></div>
    <div className={x.kretsPrompt} data-step={step}>
      <p className={s.sender}><i className={s.humanDot} />Prompt</p>
      <p className={x.kretsPromptText}>{edit("prompt", <RichLines text={t("prompt")} />)}</p>
    </div>
    <figure className={`${x.kretsModel} ${s.reveal}`} data-on={step >= 1} data-step={step} aria-hidden={step < 1} aria-label={`Modell: ${fmt(u)} volt över ${fmt(r)} ohm ger ${fmt(i)} ampere`}>
      <figcaption>I = U / R · förenklad modell</figcaption>
      <svg viewBox="180 96 540 404">
        <path className={x.wire} d={loop} />
        {!still && step >= 1 && Array.from({ length: 10 }, (_, k) => <circle key={`${k}-${step}`} className={x.charge} r="7">
          <animateMotion dur={`${(12 / i).toFixed(2)}s`} begin={`${((-k * 12) / i / 10).toFixed(2)}s`} repeatCount="indefinite" path={loop} />
        </circle>)}
        <g className={x.battery} transform="translate(250 320)"><rect x="-46" y="-70" width="92" height="140" rx="16" /><path d="M-26 -18 H26 M-14 14 H14" /><text y="112" textAnchor="middle">U</text></g>
        <g className={x.resistor} transform="translate(650 320)"><rect x="-34" y="-84" width="68" height="168" rx="10" /><text y="126" textAnchor="middle">R</text></g>
        <g className={x.meter} transform="translate(450 170)"><circle r="48" /><text y="16" textAnchor="middle">A</text></g>
      </svg>
      <dl className={x.readout}>
        <div><dt>Spänning</dt><dd data-changed={step >= 2}>{fmt(u)} V</dd></div>
        <div><dt>Resistans</dt><dd>{fmt(r)} Ω</dd></div>
        <div><dt>Ström</dt><dd data-changed={step >= 2}>{fmt(i)} A</dd></div>
      </dl>
    </figure>
    <p className={`${x.kretsQ} ${s.reveal}`} data-on={step === 1 || step === 2} aria-hidden={step !== 1 && step !== 2}>{edit("question", <RichLines text={t("question")} />)}</p>
    <h2 className={`${x.kretsFinal} ${s.reveal}`} data-on={step === 3} aria-hidden={step !== 3}>{edit("final", <RichLines text={t("final")} />)}</h2>
  </>;
}

/* ---------------------------------------------------------- pusselbiten */

export function Pussel({ t, edit, step }: FormProps) {
  const w = PIECE_W, h = PIECE_H;
  const edges = puzzleEdges();
  return <>
    <div className={x.pusselHead}><Kicker t={t} edit={edit} /></div>
    <svg className={x.pussel} viewBox="-30 -30 640 380" data-step={step} aria-label="Ett pussel med en ledig plats">
      {edges.map((row, ri) => row.map((edge, ci) => {
        const missing = ri === 0 && ci === 1;
        return <path key={`${ri}-${ci}`} className={missing ? x.slot : x.piece} d={piecePath(w, h, edge)} transform={`translate(${ci * w} ${ri * h})`} />;
      }))}
      <g className={x.aiPiece} data-step={step} style={{ "--fromx": "420px" } as CSSProperties}>
        <path d={piecePath(w, h, edges[0][1])} transform={`translate(${w} 0)`} />
        <text x={w * 1.5} y={h * .56} textAnchor="middle">{t("label") || "AI"}</text>
      </g>
    </svg>
    <h2 className={`${x.pusselTitle} ${s.reveal}`} data-on={step >= 1} aria-hidden={step < 1}>{edit("title", <RichLines text={t("title")} emphasis="EN" />)}</h2>
  </>;
}

/* ------------------------------------------------------------ studien */

export function Evidence({ t, edit, step }: FormProps) {
  const groups = [["g1", "", ""], ["g2", "v1b", "v2b"], ["g3", "v1c", "v2c"]];
  const tone = (value: string) => /^[−-]/.test(value.trim()) ? "down" : /^\+/.test(value.trim()) ? "up" : "flat";
  return <>
    <div className={x.evHead} data-dim={step === 3}>
      <Kicker t={t} edit={edit} />
      <p className={x.evStudy}>{edit("study", <RichLines text={t("study")} />)}</p>
    </div>
    <div className={x.evGrid} data-step={step} data-dim={step === 3}>
      <div className={x.evPhases} aria-hidden="true"><span data-on={step >= 1}>{t("phase1")}</span><span data-on={step >= 2}>{t("phase2")}</span></div>
      {groups.map(([g, v1, v2], i) => <article key={g} className={x.evCard} data-group={i}>
        <h3>{edit(g, <RichLines text={t(g)} />)}</h3>
        <p className={`${x.evValue} ${s.reveal}`} data-on={step >= 1} data-tone={v1 ? tone(t(v1)) : "base"}>{v1 ? edit(v1) : <span className={x.evBase}>Jämförelse</span>}</p>
        <p className={`${x.evValue} ${s.reveal}`} data-on={step >= 2} data-tone={v2 ? tone(t(v2)) : "base"}>{v2 ? edit(v2, <RichLines text={t(v2)} />) : <span className={x.evBase}>Jämförelse</span>}</p>
      </article>)}
    </div>
    <p className={`${x.evFoot} ${s.reveal}`} data-on={step >= 1 && step < 3} aria-hidden={step < 1 || step >= 3}>{edit("foot")}</p>
    <h2 className={`${x.evFinal} ${s.reveal}`} data-on={step === 3} aria-hidden={step !== 3}>{edit("final", <RichLines text={t("final")} />)}</h2>
  </>;
}

/* ------------------------------------------------------ källgranskning */

export function Sources({ t, edit, step }: FormProps) {
  const segs = [1, 2, 3].map(n => ({ n, seg: t(`seg${n}`), tag: t(`tag${n}`) })).filter(item => item.seg);
  const renderAnswer = (text: string) => {
    let nodes: ReactNode[] = [text];
    segs.forEach(({ n, seg, tag }) => {
      nodes = nodes.flatMap((node): ReactNode[] => {
        if (typeof node !== "string") return [node];
        const at = node.indexOf(seg);
        if (at < 0) return [node];
        return [node.slice(0, at), <mark key={n} className={x.seg} data-on={step >= 1} data-n={n}>{seg}{tag && <span className={x.segTag}>{tag}</span>}</mark>, node.slice(at + seg.length)];
      });
    });
    return nodes;
  };
  return <>
    <div className={x.srcHead}><Kicker t={t} edit={edit} /></div>
    <article className={x.srcAnswer} data-step={step}>
      <p className={s.sender}><i className={s.aiDot} />{edit("answerLabel")}</p>
      {edit("answer", <div className={x.srcText}>{t("answer").split("\n").filter(Boolean).map((para, i) => <p key={i}>{renderAnswer(para)}</p>)}</div>)}
    </article>
    <div className={x.srcCards}>
      {[1, 2, 3].filter(n => t(`cardTitle${n}`)).map(n => <article key={n} className={`${x.srcCard} ${s.reveal}`} data-on={step >= n + 1} data-current={step === n + 1} aria-hidden={step < n + 1}>
        <small>{edit(`cardLabel${n}`)}</small>
        <h3>{edit(`cardTitle${n}`, <RichLines text={t(`cardTitle${n}`)} />)}</h3>
        <p>{edit(`cardText${n}`, <RichLines text={t(`cardText${n}`)} />)}</p>
      </article>)}
    </div>
    <ol className={`${x.srcNotes} ${s.reveal}`} data-on={step >= 5} aria-hidden={step < 5}>
      {[1, 2, 3].filter(n => t(`note${n}`)).map(n => <li key={n} style={{ transitionDelay: step === 5 ? `${n * .15}s` : "0s" }}>{edit(`note${n}`, <RichLines text={t(`note${n}`)} />)}</li>)}
    </ol>
  </>;
}

/* ---------------------------------------------------------------- bron */

/**
 * Ett frilagt föremål (fjäderbollen) ligger på startsidan och flyger på tredje
 * klicket i en båge över vattnet till målet. X går linjärt och Y följer en
 * kvadratisk bézierkurva som timingfunktion, så banan blir en äkta båge med
 * vanliga övergångar: bakåt och R visar läget direkt, inget spelas upp igen.
 */
export function Bro({ t, edit, step }: FormProps) {
  const flying = step >= 2;
  return <>
    <div className={x.broHead}><Kicker t={t} edit={edit} /></div>
    <svg className={x.broArc} viewBox="0 0 1600 900" aria-hidden="true">
      <path className={x.broTrail} data-on={flying} d="M 240 560 Q 570 150 900 590" pathLength={1} />
    </svg>
    <div className={x.broSide} data-side="left"><small>{edit("leftLabel")}</small><strong>{edit("leftText")}</strong></div>
    <div className={x.broSide} data-side="right" data-lit={step >= 3}><small>{edit("rightLabel")}</small><strong>{edit("rightText")}</strong></div>
    <i className={x.broTarget} data-lit={flying} aria-hidden="true" />
    <div className={x.broBall} data-flying={flying}>
      <div className={x.broLift} data-flying={flying}><img src={t("image")} alt={t("imageAlt")} data-flying={flying} /></div>
    </div>
    <figure className={`${x.broExcerpt} ${s.reveal}`} data-on={step === 1} aria-hidden={step !== 1}>
      <figcaption>{edit("excerptLabel")}</figcaption>
      <blockquote>{edit("excerpt", <RichLines text={t("excerpt")} />)}</blockquote>
    </figure>
    <div className={x.broTitle}>
      <h2 className={s.reveal} data-on={flying} aria-hidden={!flying}>{edit("title", <RichLines text={t("title")} />)}</h2>
      <h2 className={`${x.broSoft} ${s.reveal}`} data-on={step >= 3} aria-hidden={step < 3}>{edit("title2", <RichLines text={t("title2")} />)}</h2>
      {t("route") && <p className={`${x.broRoute} ${s.reveal}`} data-on={step >= 3} aria-hidden={step < 3}>{edit("route", <RichLines text={t("route")} />)}</p>}
    </div>
  </>;
}

/* ----------------------------------------------------------- variationen */

/**
 * Två bilder bredvid varandra. Andra klicket: samma plats, olika teman. Tredje:
 * samma tema, en ny plats. Likhetstecken och olikhetstecken byter rad.
 */
export function Variation({ t, edit, step }: FormProps) {
  const legend = step === 1 ? 1 : step === 2 ? 2 : 0;
  const visible = (n: number) => n === 1 || (n === 2 ? step === 1 : step >= 2);
  return <>
    <div className={x.varHead} data-dim={step === 3}>
      <Kicker t={t} edit={edit} />
      <h2 className={`${x.varTitle} ${s.reveal}`} data-on={step === 0} aria-hidden={step !== 0}>{edit("title", <RichLines text={t("title")} />)}</h2>
      {[1, 2].map(k => <p key={k} className={`${x.varLegend} ${s.reveal}`} data-on={legend === k} aria-hidden={legend !== k}>
        <span data-kind="same">{edit(`same${k}`)}</span><span data-kind="vary">{edit(`vary${k}`)}</span>
      </p>)}
    </div>
    <div className={x.varCards} data-step={step}>
      {[1, 2, 3].map(n => <figure key={n} className={x.varCard} data-card={n} data-on={visible(n)} aria-hidden={!visible(n)}>
        <img src={t(`media${n}`)} alt={t(`alt${n}`)} />
        <figcaption>
          {t("themeLabel") && <small>{edit("themeLabel")}</small>}
          <strong>{edit(`theme${n}`)}</strong>
          <span>{edit(`plot${n}`, <RichLines text={t(`plot${n}`)} />)}</span>
        </figcaption>
      </figure>)}
      <i className={x.varSign} data-row="place" data-sign={step === 1 ? "same" : step === 2 ? "vary" : "none"} aria-hidden="true" />
      <i className={x.varSign} data-row="theme" data-sign={step === 1 ? "vary" : step === 2 ? "same" : "none"} aria-hidden="true" />
    </div>
    <h2 className={`${x.varQuestion} ${s.reveal}`} data-on={step === 3} aria-hidden={step !== 3}>{edit("question", <RichLines text={t("question")} />)}</h2>
  </>;
}

/* ------------------------------------------------------- instruktionen */

/**
 * Den korta beställningen → instruktionen växer i tre delar → en rad ur del 3
 * förstoras → ett exempel på ett slut som ger bort temat stryks och ersätts.
 */
export function Instruktion({ t, edit, step }: FormProps) {
  const parts = [1, 2, 3].filter(n => t(`part${n}`));
  const last = parts[parts.length - 1];
  // Sista delen och den förstorade raden kommer på samma klick; slutet på nästa.
  const lastStep = parts.length;
  const zoomed = Boolean(t("zoom")) && step >= lastStep;
  const ended = Boolean(t("badEnd")) && step > lastStep;
  return <>
    <div className={x.insHead}><Kicker t={t} edit={edit} /></div>
    <div className={`${x.insStart} ${s.reveal}`} data-on={step === 0} aria-hidden={step !== 0}>
      <p className={x.insBubble}><small><i className={s.humanDot} />{edit("startLabel")}</small>{edit("start", <RichLines text={t("start")} />)}</p>
      {t("startNote") && <p className={x.insStartNote}>{edit("startNote", <RichLines text={t("startNote")} />)}</p>}
    </div>
    <section className={x.insPanel} data-step={step} data-zoomed={zoomed} data-ended={ended} aria-hidden={step === 0}>
      <p className={x.insLabel}><i className={s.humanDot} />{edit("panelLabel")}</p>
      {parts.map((n, i) => <div key={n} className={x.insPart} data-on={step >= i + 1} data-current={step === i + 1}>
        <div>
          <small>{edit(`part${n}Tag`)}</small>
          <p>{edit(`part${n}`, <RichLines text={t(`part${n}`)} emphasis={n === last && zoomed ? t("zoom") : ""} markClass={x.insMark} />)}</p>
        </div>
      </div>)}
    </section>
    {t("zoom") && <p className={`${x.insZoom} ${s.reveal}`} data-on={zoomed && !ended} aria-hidden={!zoomed || ended}>{edit("zoom", <RichLines text={t("zoom")} />)}</p>}
    {t("badEnd") && <figure className={`${x.insEnd} ${s.reveal}`} data-on={ended} aria-hidden={!ended}>
      <figcaption>{edit("endLabel")}</figcaption>
      <p className={x.insBad}>{edit("badEnd", <span className={x.strike}>{t("badEnd")}</span>)}</p>
      <p className={x.insGood}><span aria-hidden="true">→</span>{edit("goodEnd", <RichLines text={t("goodEnd")} />)}</p>
    </figure>}
  </>;
}

/* ---------------------------------------------------------------- boken */

/** Ett frilagt föremål med rubrik, och på nästa klick ett förlopp som går runt. */
export function Bok({ t, edit, step }: FormProps) {
  const loop = [1, 2, 3, 4].filter(n => t(`loop${n}`));
  return <>
    <figure className={x.bokImage} data-step={step}><img src={t("image")} alt={t("imageAlt")} /></figure>
    <div className={x.bokText}>
      <Kicker t={t} edit={edit} />
      <h2>{edit("title", <RichLines text={t("title")} />)}</h2>
      {t("subtitle") && <p className={x.bokSub}>{edit("subtitle", <RichLines text={t("subtitle")} />)}</p>}
    </div>
    {loop.length > 0 && <div className={`${x.bokLoop} ${s.reveal}`} data-on={step >= 1} data-kind={t("loopKind") === "list" ? "list" : "loop"} aria-hidden={step < 1}>
      <small>{edit("loopLabel")}</small>
      <ol>{loop.map((n, i) => <li key={n} style={{ transitionDelay: step >= 1 ? `${.15 + i * .22}s` : "0s" }} data-on={step >= 1}>{edit(`loop${n}`)}</li>)}</ol>
      {t("loopNote") && <p>{edit("loopNote", <RichLines text={t("loopNote")} />)}</p>}
    </div>}
  </>;
}

/* ------------------------------------------------------ prompt och svar */

type MarkRule = { words: string[]; className: string };

/** Lägger märken på ord i en rad; den tidigaste träffen först, sedan resten. */
function markText(text: string, rules: MarkRule[]): ReactNode {
  const hits = rules.flatMap(rule => rule.words.map(word => ({ rule, word, at: text.indexOf(word) }))).filter(hit => hit.word && hit.at >= 0).sort((a, b) => a.at - b.at);
  const hit = hits[0];
  if (!hit) return text;
  return <>{text.slice(0, hit.at)}<mark className={hit.rule.className}>{hit.word}</mark>{markText(text.slice(hit.at + hit.word.length), rules)}</>;
}

/**
 * En lång prompt med inklistrat underlag. Nästa klick: prompten drar sig undan
 * och svaret kommer på papper, med det viktigaste framlyft. Därefter markeras
 * en överdrift, och sist en valfri slutrad.
 */
export function Answer({ t, edit, step }: FormProps) {
  const flagged = Boolean(t("flag"));
  const answered = step >= 1;
  const resting = Boolean(t("note")) && step >= 2 + (flagged ? 1 : 0);
  const rules: MarkRule[] = [
    // Propen heter highlight: mark läses av slide-omslaget som markord och når aldrig mallen.
    ...(answered ? [{ words: list(t("highlight")), className: x.ansMark }] : []),
    ...(flagged && step >= 2 ? [{ words: list(t("flag")), className: x.ansFlag }] : []),
  ];
  const rows = t("answer").split("\n").map(row => row.trim()).filter(Boolean);
  return <>
    <div className={x.ansHead}><Kicker t={t} edit={edit} /></div>
    <section className={x.ansPrompt} data-answered={answered} data-resting={resting}>
      <p className={s.sender}><i className={s.humanDot} />{edit("promptLabel")}</p>
      <div className={x.ansPromptText}>{edit("prompt", <RichLines text={t("prompt")} className={x.ansLines} />)}</div>
      {t("material") && <div className={x.ansMaterial}>{edit("material", <RichLines text={t("material")} />)}</div>}
    </section>
    <div className={`${x.ansAnswer} ${s.reveal}`} data-on={answered} data-resting={resting} data-flagged={flagged} aria-hidden={!answered}>
      <article className={x.ansPaper}>
        <p className={x.ansLabel}><i className={s.aiDot} />{edit("answerLabel")}</p>
        {edit("answer", <div className={x.ansText}>{rows.map((row, i) => row.startsWith("#")
          ? <h3 key={i}>{markText(row.replace(/^#+\s*/, ""), rules)}</h3>
          : <p key={i}>{markText(row, rules)}</p>)}</div>)}
      </article>
      {flagged && t("flagNote") && <p className={`${x.ansFlagNote} ${s.reveal}`} data-on={step >= 2} aria-hidden={step < 2}><i aria-hidden="true" />{edit("flagNote", <RichLines text={t("flagNote")} />)}</p>}
    </div>
    {t("note") && <h2 className={`${x.ansNote} ${s.reveal}`} data-on={resting} aria-hidden={!resting}>{edit("note", <RichLines text={t("note")} />)}</h2>}
  </>;
}

/* ------------------------------------------------------------ friktionen */

type Owner = "none" | "pupil" | "help" | "taken";

/**
 * En uppgift med tre arbetsmoment. Läge 1: AI tar bort ett hinder. Läge 2: AI
 * tar över tänkandet. Läge 3: extra verktygsarbete tillkommer. Sist frågan.
 */
export function Friktion({ t, edit, step }: FormProps) {
  const state = step >= 1 && step <= 3 ? step : 0;
  const owner = (i: number): Owner => state === 1 || state === 2 ? (i === 0 ? "help" : state === 2 ? "taken" : "pupil") : state === 3 ? "pupil" : "none";
  const ownerField: Record<Owner, string> = { none: "", pupil: "pupilLabel", help: "helpLabel", taken: "aiLabel" };
  const extras = [1, 2, 3].filter(n => t(`extra${n}`));
  return <>
    <div className={x.friHead} data-dim={step === 4}><Kicker t={t} edit={edit} /><h2 className={x.friTask}>{edit("context", <RichLines text={t("context")} />)}</h2></div>
    <ol className={x.friWorks} data-dim={step === 4}>
      {[1, 2, 3].map((n, i) => <li key={n} data-owner={owner(i)}>
        <strong>{edit(`work${n}`)}</strong>
        <small>{owner(i) !== "none" ? edit(ownerField[owner(i)]) : null}</small>
      </li>)}
    </ol>
    <div className={x.friExtras} data-on={state === 3} aria-hidden={state !== 3}>{extras.map((n, i) => <span key={n} style={{ "--i": i } as CSSProperties}>{edit(`extra${n}`)}</span>)}</div>
    {[1, 2, 3].map(n => <div key={n} className={`${x.friState} ${s.reveal}`} data-on={state === n} data-kind={n} aria-hidden={state !== n}>
      <h3>{edit(`label${n}`)}</h3>
      <p>{edit(`detail${n}`, <RichLines text={t(`detail${n}`)} />)}</p>
    </div>)}
    <h2 className={`${x.friQuestion} ${s.reveal}`} data-on={step === 4} aria-hidden={step !== 4}>{edit("question", <RichLines text={t("question")} />)}</h2>
  </>;
}

/* --------------------------------------------------------------- utdraget */

/** En hel instruktion i liten skala med en rad markerad, och samma rad stort. */
export function Utdrag({ t, edit }: FormProps) {
  return <>
    <div className={x.utHead}><Kicker t={t} edit={edit} /></div>
    <section className={x.utPanel}>
      <p className={x.utLabel}><i className={s.humanDot} />{edit("label")}</p>
      <p className={x.utText}>{edit("text", <RichLines text={t("text")} emphasis={t("line")} markClass={x.insMark} />)}</p>
    </section>
    <blockquote className={x.utLine}>{edit("line", <RichLines text={t("line")} />)}</blockquote>
  </>;
}

/* ---------------------------------------------------------------- bredden */

const SPREAD = [[130, 240, -6], [445, 215, 4], [770, 250, -3], [100, 410, 5], [420, 395, -4], [745, 420, 6], [150, 590, -2], [460, 600, 3], [790, 575, -5]];
const CLUSTER = [[430, 390, -2], [470, 378, 2], [505, 398, -1], [418, 420, 1], [458, 414, -3], [498, 430, 2], [438, 450, -1], [476, 444, 3], [512, 456, -2]];
const CARD_ROLES = ["human", "ai", "glow", "shared"];

/**
 * Schematisk bild: berättelser som var för sig blir bättre, och sedan glider
 * ihop. Kortens placering är en illustration, inga mätvärden.
 */
export function Bredd({ t, edit, step }: FormProps) {
  return <>
    <div className={x.brHead}>
      <Kicker t={t} edit={edit} />
      {[1, 2, 3].map(n => <h2 key={n} className={`${x.brLine} ${s.reveal}`} data-on={step === n - 1} aria-hidden={step !== n - 1}>{edit(`stage${n}`, <RichLines text={t(`stage${n}`)} />)}</h2>)}
    </div>
    <div className={x.brField} data-step={step} aria-hidden="true">
      {SPREAD.map(([sx, sy, sr], i) => <span key={i} className={x.brCard} data-role={CARD_ROLES[i % CARD_ROLES.length]}
        style={{ "--x": `${sx}px`, "--y": `${sy}px`, "--r": `${sr}deg`, "--cx": `${CLUSTER[i][0]}px`, "--cy": `${CLUSTER[i][1]}px`, "--cr": `${CLUSTER[i][2]}deg`, "--i": i } as CSSProperties}>
        <i /><b /><b /><b />
      </span>)}
    </div>
    <h2 className={`${x.brQuestion} ${s.reveal}`} data-on={step === 3} aria-hidden={step !== 3}>{edit("question", <RichLines text={t("question")} />)}</h2>
  </>;
}

/* ------------------------------------------------------------ uppgiften */

/** En uppgift bryts upp i sina arbeten, och målet lyfter fram de som ska övas. */
export function Bryt({ t, edit, step }: FormProps) {
  const parts = [1, 2, 3, 4, 5, 6].filter(n => t(`part${n}`));
  const goal = new Set(t("goal").split(/[^0-9]+/).map(Number).filter(Boolean));
  return <>
    <div className={x.bryHead}><Kicker t={t} edit={edit} /></div>
    <div className={x.bryTask} data-step={step}>
      {t("taskLabel") && <small>{edit("taskLabel")}</small>}
      <p>{edit("task", <RichLines text={t("task")} />)}</p>
    </div>
    <ol className={x.bryParts}>
      {parts.map((n, i) => <li key={n} data-on={step >= 1} data-goal={step >= 2 && goal.has(n)} data-dim={step >= 2 && !goal.has(n)} style={{ "--i": i } as CSSProperties}>{edit(`part${n}`)}</li>)}
    </ol>
    <div className={`${x.bryFocus} ${s.reveal}`} data-on={step >= 2} aria-hidden={step < 2}>
      <small>{edit("focus")}</small>
      <p>{edit("detail", <RichLines text={t("detail")} />)}</p>
    </div>
  </>;
}

/* ----------------------------------------------------------- tvillingarna */

/** Rubriken ensam → ett tvillingpar per klick → slutsatsen medan paren dämpas. */
export function Tvilling({ t, edit, step }: FormProps) {
  const rows = [1, 2, 3].filter(n => t(`task${n}`));
  const resting = Boolean(t("note")) && step > rows.length;
  return <>
    <div className={x.twHead} data-resting={resting}>
      <Kicker t={t} edit={edit} />
      <h2>{edit("title", <RichLines text={t("title")} />)}</h2>
    </div>
    <div className={x.twRows} data-resting={resting}>
      <div className={`${x.twCols} ${s.reveal}`} data-on={step >= 1} aria-hidden={step < 1}><span /><small>{edit("leftLabel")}</small><span /><small>{edit("rightLabel")}</small></div>
      {rows.map((n, i) => <div key={n} className={`${x.twRow} ${s.reveal}`} data-on={step >= i + 1} aria-hidden={step < i + 1}>
        <small className={x.twSubj}>{edit(`subj${n}`)}</small>
        <p className={x.twTask}>{edit(`task${n}`, <RichLines text={t(`task${n}`)} />)}</p>
        <span className={x.twArrow} aria-hidden="true">→</span>
        <p className={x.twTwin}>{edit(`twin${n}`, <RichLines text={t(`twin${n}`)} />)}</p>
      </div>)}
    </div>
    {t("note") && <h2 className={`${x.twNote} ${s.reveal}`} data-on={resting} aria-hidden={!resting}>{edit("note", <RichLines text={t("note")} />)}</h2>}
  </>;
}

/* ------------------------------------------------------ skärmbilden */

/**
 * En elev bifogar en skärmbild av en kompischatt. Sedan markeras det som följde
 * med, en sak i taget: profilbild och namn, familjens situation, ett förtroende.
 * Frågan står ensam, och sist svarar två fiktiva tjänster olika.
 */
export function Privat({ t, edit, step }: FormProps) {
  const marked = (n: number) => step >= 1 && step <= 3 && (n <= 2 || step >= n - 1);
  const phrase = (key: string, phraseKey: string, n: number) => {
    const text = t(key), part = t(phraseKey), at = part ? text.indexOf(part) : -1;
    return at < 0 ? <>{text}</> : <>{text.slice(0, at)}<mark className={x.pvMark} data-on={marked(n)}>{part}<b aria-hidden="true">{n}</b></mark>{text.slice(at + part.length)}</>;
  };
  return <>
    <div className={x.pvHead} data-off={step >= 4}><Kicker t={t} edit={edit} /><h2>{edit("title", <RichLines text={t("title")} />)}</h2></div>
    <section className={x.pvChat} data-on={step === 0} aria-hidden={step !== 0}>
      <p className={x.pvApp}><i className={s.aiDot} />{edit("appLabel")}</p>
      <div className={x.pvPrompt}>
        <small><i className={s.humanDot} />{edit("promptLabel")}</small>
        <p>{edit("prompt", <RichLines text={t("prompt")} />)}</p>
      </div>
      <p className={x.pvAttach}>{edit("attachLabel")}</p>
    </section>
    <ol className={x.pvList} data-on={step >= 1 && step <= 3} aria-hidden={step < 1 || step > 3}>
      {[1, 2, 3, 4].map(n => <li key={n} data-on={marked(n)}><b>{n}</b>{edit(`mark${n}`)}</li>)}
    </ol>
    <figure className={x.pvPhone} data-state={step >= 5 ? "gone" : step === 4 ? "dim" : "on"} aria-label={t("screenshotLabel")}>
      <figcaption>{edit("screenshotLabel")}</figcaption>
      <header>
        <span className={x.pvAvatar} data-marked={marked(1)}><img src={t("image")} alt={t("imageAlt")} /><b aria-hidden="true">1</b></span>
        <span className={x.pvWho} data-marked={marked(2)}><strong>{edit("contactName")}</strong><small>{edit("contactDetail")}</small><b aria-hidden="true">2</b></span>
      </header>
      <p className={x.pvDay}>{edit("chatDate")}</p>
      <p className={x.pvMsg} data-side="them">{edit("message1", phrase("message1", "highlight1", 3))}</p>
      <p className={x.pvMsg} data-side="me">{edit("message2")}</p>
      <p className={x.pvMsg} data-side="them">{edit("message3", phrase("message3", "highlight2", 4))}</p>
    </figure>
    <h2 className={`${x.pvQuestion} ${s.reveal}`} data-on={step === 4} aria-hidden={step !== 4}>{edit("question", <RichLines text={t("question")} />)}</h2>
    <div className={`${x.pvServices} ${s.reveal}`} data-on={step >= 5} aria-hidden={step < 5}>
      {[1, 2].map(n => <article key={n} data-n={n}><small>{edit(`serviceLabel${n}`)}</small><p>{edit(`service${n}`, <RichLines text={t(`service${n}`)} />)}</p></article>)}
      <h3>{edit("note", <RichLines text={t("note")} />)}</h3>
    </div>
  </>;
}

/** Enkel hjälpare för scener som vill markera ett ord i en rad. */
export function Emph({ text, word }: { text: string; word: string }) {
  return <Marked text={text} mark={word} className={s.glowMark} />;
}
