"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { resolveMetrInputs, makeMetrChart, formatMetrDate, type MetrDataset, type MetrRateReport } from "./metr-horizon-data";
import styles from "./MetrHorizon.module.css";

type Props = { title?: string; chapter?: string };
function Frame({ title, chapter, kind, step, source, footer, children }: Props & { kind: string; step: number; source: ReactNode; footer: ReactNode; children: ReactNode }) {
  return <section className={styles.scene} data-benchmark={kind} data-benchmark-step={step}>
    <header><p className={styles.kicker}>{chapter}</p><h2>{title}</h2></header>
    <div className={styles.stage} aria-live="polite">{children}</div>
    <footer><p>{footer}</p><div className={styles.source}>{source}</div></footer>
  </section>;
}
const doublingIllustration = Array.from({ length: 91 }, (_, i) => `${i ? "L" : "M"}${110+i/90*710},${450-2**(i/90*3)/8*360}`).join(" ");

export interface MetrHorizonProps { title?: string; chapter?: string; dataset?: MetrDataset | string; report?: MetrRateReport | string | null; }
export function MetrHorizon({ dataset, report, ...props }: MetrHorizonProps) {
  try {
    const {data, rate} = resolveMetrInputs(dataset, report);
    return <MetrHorizonScene {...props} data={data} rate={rate} />;
  } catch (error) {
    return <section className={styles.scene} role="alert"><header><h2>Kontrollera METR-underlaget</h2></header><p>{error instanceof Error ? error.message : "Ogiltiga data."}</p></section>;
  }
}

function MetrHorizonScene({ title = "Längre uppgifter. Snabb utveckling.", chapter = "Förmåga över tid · METR", data: metr, rate }: Props & { data: MetrDataset; rate: MetrRateReport | null }) {
  const chart = makeMetrChart(metr);
  const { x, y, trend, maxHours, tickHours, reliableMinutes, points, firstYear, lastYear, earlyUntil, fitSince } = chart;
  const REPORTED_DOUBLING_DAYS = rate?.days ?? 0;
  const step = Math.min(useSlideSteps(rate ? 4 : 3), rate ? 3 : 2);
  const reduced = useReducedMotion();
  const shown = points.filter(p => step >= 2 || p.date < earlyUntil);
  const footers = [
    <>Tiden beskriver <strong>uppgiftens längd för en människa.</strong></>,
    <>Samma skala genom hela förloppet. <strong>50 procents sannolikhet att lyckas.</strong></>,
    <>Varje punkt är en modell. <strong>Tekniska uppgifter med tydliga mål.</strong></>,
    <>En historiskt uppmätt takt. <strong>Här illustrerad med tre fördubblingar.</strong></>,
  ];
  return <Frame kind="metr" step={step} title={title} chapter={chapter} footer={footers[step]} source={step === 3 && rate ? <a href={rate.sourceUrl} target="_blank" rel="noreferrer">METR · {metr.version} · {rate.period} · analys publicerad {formatMetrDate(rate.published)}</a> : <a href={metr.sourceUrl} target="_blank" rel="noreferrer">METR · {metr.version} · data {formatMetrDate(metr.updated)} · kontrollerat {formatMetrDate(metr.checked)}</a>}>
    {step === 0 ? <div className={styles.definition} data-benchmark-panel="definition">
      <div className={styles.definitionCopy}><span className={styles.label}>SÅ LÄSER DU MÅTTET</span><h3>Hur lång uppgift klarar AI?</h3><p>Programmering, maskininlärning och cybersäkerhet.</p></div>
      <div className={styles.definitionCards}><article><span>En expert behöver</span><b>1 timme</b><p>för en uppgift</p></article><article><span>AI lyckas med</span><b>50 %</b><p>sannolikhet på den nivån</p></article><small>Illustration: då är tidshorisonten 1 timme.</small></div>
    </div> : <div className={styles.chartLayout} data-benchmark-panel="chart">
      {step === 3 ? <div className={styles.chart} data-metr-doubling-illustration>
        <p className={styles.axisCaption}>Så växer uppgiftslängden vid samma takt</p>
        <svg viewBox="0 0 940 520" role="img" aria-label={`Schematisk illustration av rapporterad fördubblingstakt: relativ uppgiftslängd gånger 1, 2, 4 och 8 efter tre intervall på cirka ${Math.round(REPORTED_DOUBLING_DAYS)} dagar. Ingen prognos för specifika modeller.`}>
          {[1,2,4,8].map(factor => <g key={factor}><line x1="86" x2="876" y1={450-factor/8*360} y2={450-factor/8*360} stroke="currentColor" opacity=".18"/><text x="65" y={459-factor/8*360} textAnchor="end">×{factor}</text></g>)}
          <motion.path d={doublingIllustration} fill="none" stroke="var(--accent)" strokeWidth="5" initial={reduced ? false : {pathLength:0}} animate={{pathLength:1}} transition={{duration:reduced?0:.8}} />
          {[0,1,2,3].map(i => <g key={i}><circle cx={110+i/3*710} cy={450-2**i/8*360} r="8" fill="var(--accent)"/><text x={110+i/3*710} y="493" textAnchor="middle">{i ? `+${i*Math.round(REPORTED_DOUBLING_DAYS)} dagar` : "Start"}</text></g>)}
        </svg>
        <div className={styles.legend}>Illustration av takten · ingen modellprognos</div>
      </div> : <div className={styles.chart}>
        <p className={styles.axisCaption}>Expertens arbetstid · timmar · 50 %-nivå</p>
        <svg viewBox="0 0 940 520" role="img" aria-label={`METR:s tidshorisonter vid 50 procents sannolikhet att lyckas. Linjär skala från 0 till ${maxHours} timmar. Mätningar ${firstYear}–${step === 1 ? Number(earlyUntil.slice(0,4)) - 1 : lastYear}.`}>
          <rect x="86" y={y(maxHours*60)} width="790" height={y(reliableMinutes)-y(maxHours*60)} fill="var(--accent-alert)" opacity=".08" />
          {Array.from({length:6},(_,i)=>i*tickHours).map(h => <g key={h}><line x1="86" x2="876" y1={y(h*60)} y2={y(h*60)} stroke="currentColor" opacity=".18"/><text x="65" y={y(h*60)+9} textAnchor="end">{h}</text></g>)}
          {Array.from({length:lastYear-firstYear+1},(_,i)=>firstYear+i).map(year => <text key={year} x={x(`${year}-01-01`)} y="492" textAnchor="middle">{year}</text>)}
          <text x="102" y="80" className={styles.uncertainLabel}>Över {metr.maxReliableHours} h: osäkra skattningar</text>
          {step === 2 && trend && <motion.path data-metr-trend d={trend} fill="none" stroke="var(--accent)" strokeWidth="5" initial={reduced ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: reduced ? 0 : .8 }} />}
          {shown.map(p => <g key={p.id} data-metr-point={p.id} data-minutes={p.minutes}><title>{p.id}: {(p.minutes/60).toFixed(2)} timmar{p.low !== undefined && p.high !== undefined ? `; 95 % intervall ${(p.low/60).toFixed(2)}–${(p.high/60).toFixed(2)} timmar` : ""}</title><circle cx={x(p.date)} cy={y(p.minutes)} r={p.minutes>reliableMinutes?9:6} fill={p.minutes>reliableMinutes?"var(--bg)":"var(--text)"} stroke={p.minutes>reliableMinutes?"var(--accent-alert)":"var(--text)"} strokeWidth="3" /></g>)}
        </svg>
        <div className={styles.legend}><span>● Modellernas punktestimat</span>{step === 2 && trend && <span className={styles.accent}>━ Trend sedan {fitSince.slice(0,4)}</span>}</div>
      </div>}
      <div className={styles.chartCopy}>
        {step === 1 && <><span className={styles.label}>{firstYear} → {Number(earlyUntil.slice(0,4))-1}</span><h3>Från minuter…</h3><p>De tidiga mätningarna ligger nära golvet på den här skalan.</p></>}
        {step === 2 && <><span className={styles.label}>{earlyUntil.slice(0,4)} → {lastYear}</span><h3>…till timmar.</h3><p>Högst upp börjar testet få svårt att mäta säkert.</p>{metr.latestNote && <small>{metr.latestNote}</small>}</>}
        {step === 3 && rate && <><span className={styles.label}>{rate.period.toLocaleUpperCase("sv-SE")} · METR:S ANALYS</span><strong className={styles.doubling}>≈{Math.round(REPORTED_DOUBLING_DAYS)}</strong><h3 className={styles.days}>dagar</h3><p>{rate.summary ?? "Tre fördubblingar ger åtta gånger så lång uppgift."}</p><small>Rapporterat {formatMetrDate(rate.published)}.</small></>}
      </div>
    </div>}
  </Frame>;
}
