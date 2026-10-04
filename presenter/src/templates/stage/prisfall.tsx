"use client";

import type { CSSProperties } from "react";
import type { FormProps } from "./forms";
import p from "./prisfall.module.css";

/*
 * Prisfallet (visualiseringspasset 1 oktober 2026): en logaritmisk kurva över vad ett svar kostar, för
 * affischen om omdömet. Kurvan ritas på första klicket och dämpas när nästa led kommer. Schematisk trend
 * ur en källa, inga uppmätta punkter: visData = "från|till|faktor per år" (till exempel 2023|2025|40),
 * visText = "etikett på kurvan|källrad". Valbart lager i formen poster (fältet vis="prisfall").
 */

const PLOT = { x0: 1050, x1: 1460, y0: 286, y1: 578 };

export function PriceFall({ t, step, still }: Pick<FormProps, "t" | "step" | "still">) {
  const [from = 2023, to = 2025, factor = 40] = (t("visData") || "2023|2025|40").split("|").map(Number);
  const [label = `÷ ${factor} per år`, source = ""] = (t("visText") || "").split("|").map(part => part.trim());
  const years = Array.from({ length: Math.max(1, to - from) + 1 }, (_, i) => from + i);
  const span = Math.max(1, to - from);
  const total = Math.pow(factor, span);
  const decades = Math.max(1, Math.ceil(Math.log10(total)));
  const y = (value: number) => PLOT.y0 + (-Math.log10(value)) / Math.log10(total) * (PLOT.y1 - PLOT.y0);
  const x = (year: number) => PLOT.x0 + (year - from) / span * (PLOT.x1 - PLOT.x0);
  const ticks = Array.from({ length: decades + 1 }, (_, k) => Math.pow(10, -k)).filter(v => v >= 1 / total * .999);
  return <figure className={p.fall} data-dim={step >= 1} data-still={still} aria-label={`${label}. ${source}`}>
    <svg viewBox="0 0 1600 900" aria-hidden="true">
      {ticks.map((value, k) => <g key={k}>
        <path className={p.grid} d={`M ${PLOT.x0 - 10} ${y(value).toFixed(1)} H ${PLOT.x1 + 20}`} />
        <text className={p.tick} x={PLOT.x0 - 22} y={y(value) + 5} textAnchor="end">{k === 0 ? "1" : `1/${Math.pow(10, k)}`}</text>
      </g>)}
      {years.map(year => <text key={year} className={p.tick} x={x(year)} y={PLOT.y1 + 42} textAnchor="middle">{year}</text>)}
      <path className={p.line} d={`M ${x(from)} ${y(1).toFixed(1)} L ${x(to)} ${y(1 / total).toFixed(1)}`} pathLength={1} />
      {years.map((year, i) => <circle key={year} className={p.dot} cx={x(year)} cy={y(Math.pow(factor, -i)).toFixed(1)} r="6" style={{ "--i": i, "--n": years.length - 1 } as CSSProperties} />)}
      <text className={p.label} x={x(from + span / 2) + 26} y={y(Math.pow(factor, -span / 2)) - 18}>{label}</text>
    </svg>
    {source && <figcaption className={p.source}>{source}</figcaption>}
  </figure>;
}
