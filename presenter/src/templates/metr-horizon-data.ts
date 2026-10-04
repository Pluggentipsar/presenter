import snapshot from "./data/metr-th11-2026-05-08.json";

export interface MetrPoint {
  id: string;
  date: string;
  minutes: number;
  low?: number;
  high?: number;
  frontier: boolean;
}
export interface MetrDataset {
  version: string;
  source: string;
  sourceUrl: string;
  updated: string;
  checked: string;
  points: MetrPoint[];
  earlyUntil?: string;
  fitSince?: string;
  axisEnd?: string;
  maxReliableHours: number;
  latestNote?: string;
}
export interface MetrRateReport {
  days: number;
  period: string;
  published: string;
  sourceUrl: string;
  summary?: string;
}
export const defaultMetrDataset: MetrDataset = snapshot;
export const defaultMetrReport: MetrRateReport = {
  days: 88.6,
  period: "Sedan 2024",
  published: "2026-01-29",
  sourceUrl: "https://metr.org/blog/2026-1-29-time-horizon-1-1/",
  summary: "Knappt tre månader mellan fördubblingarna.",
};
const DAY = 86400000;
const dateValue = (value: string) => Date.parse(value);
export const formatMetrDate = (date: string) => new Intl.DateTimeFormat("sv-SE", {
  day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
}).format(new Date(date));
const isDate = (value: unknown): value is string => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
const isUrl = (value: unknown) => typeof value === "string" && /^https?:\/\//.test(value);
const positive = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && value > 0;

/** The editor stores complex props as JSON strings; JSX callers may pass objects. */
export function resolveMetrInputs(dataset?: MetrDataset | string, report?: MetrRateReport | string | null) {
  const custom = dataset !== undefined && dataset !== "";
  const data: MetrDataset = custom ? (typeof dataset === "string" ? JSON.parse(dataset) : dataset) : defaultMetrDataset;
  // An unrelated dataset must never inherit the dated January 2026 rate.
  const rate: MetrRateReport | null = report === undefined || report === ""
    ? (custom ? null : defaultMetrReport)
    : typeof report === "string" ? JSON.parse(report) : report;
  if (!data || !data.version || !isUrl(data.source) || !isUrl(data.sourceUrl) || !isDate(data.updated) || !isDate(data.checked) || !positive(data.maxReliableHours) || !Array.isArray(data.points) || data.points.length < 2) {
    throw new Error("METR: ange version, källor, giltiga datum, maxReliableHours och minst två mätpunkter.");
  }
  const ids = new Set<string>();
  for (const point of data.points) {
    if (!point.id || ids.has(point.id) || !isDate(point.date) || !positive(point.minutes) || typeof point.frontier !== "boolean" ||
      (point.low !== undefined && (!positive(point.low) || point.low > point.minutes)) ||
      (point.high !== undefined && (!positive(point.high) || point.high < point.minutes))) {
      throw new Error("METR: kontrollera punkternas id, datum, minuter och osäkerhetsintervall.");
    }
    ids.add(point.id);
  }
  for (const key of ["earlyUntil", "fitSince", "axisEnd"] as const) {
    if (data[key] !== undefined && !isDate(data[key])) throw new Error(`METR: ${key} måste vara ett datum (ÅÅÅÅ-MM-DD).`);
  }
  if (rate && (!positive(rate.days) || !rate.period || !isDate(rate.published) || !isUrl(rate.sourceUrl))) {
    throw new Error("METR: rapportens dagar, period, publiceringsdatum och källa måste anges tillsammans.");
  }
  return { data, rate };
}

/** Least-squares fit in log(minutes), restricted to observed frontier points. */
export function makeMetrChart(data: MetrDataset) {
  const points = [...data.points].sort((a, b) => a.date.localeCompare(b.date));
  const firstYear = Number(points[0].date.slice(0, 4));
  const lastYear = Number(points.at(-1)!.date.slice(0, 4));
  const start = dateValue(`${firstYear}-01-01`);
  const end = Math.max(dateValue(data.axisEnd ?? `${lastYear + 1}-01-01`), dateValue(points.at(-1)!.date) + 30 * DAY);
  const earlyUntil = data.earlyUntil ?? `${Math.min(firstYear + 2, lastYear)}-01-01`;
  const fitSince = data.fitSince ?? `${firstYear}-01-01`;
  const reliableMinutes = data.maxReliableHours * 60;
  const maxPointHours = Math.max(...points.map(p => p.minutes)) / 60;
  const tickHours = Math.max(1, Math.ceil(Math.max(maxPointHours, data.maxReliableHours) / 5));
  const maxHours = tickHours * 5;
  const x = (date: string) => 86 + (dateValue(date) - start) / (end - start) * 790;
  const y = (minutes: number) => 450 - minutes / (maxHours * 60) * 400;
  const fitted = points.filter(p => p.frontier && p.minutes <= reliableMinutes && p.date >= fitSince);
  let trend = "";
  let doublingDays: number | null = null;
  if (fitted.length > 1) {
    const xs = fitted.map(p => (dateValue(p.date) - start) / DAY);
    const ys = fitted.map(p => Math.log(p.minutes));
    const meanX = xs.reduce((a, b) => a + b, 0) / xs.length;
    const meanY = ys.reduce((a, b) => a + b, 0) / ys.length;
    const variance = xs.reduce((sum, v) => sum + (v - meanX) ** 2, 0);
    if (variance > 0) {
      const slope = xs.reduce((sum, v, i) => sum + (v - meanX) * (ys[i] - meanY), 0) / variance;
      const intercept = meanY - slope * meanX;
      doublingDays = slope > 0 ? Math.log(2) / slope : null;
      trend = Array.from({ length: 100 }, (_, i) => {
        const d = xs[0] + (xs.at(-1)! - xs[0]) * i / 99;
        return `${i ? "L" : "M"}${86 + d * DAY / (end - start) * 790},${y(Math.exp(intercept + slope * d))}`;
      }).join(" ");
    }
  }
  return { points, firstYear, lastYear, earlyUntil, fitSince, reliableMinutes, maxHours, tickHours, x, y, trend, doublingDays };
}
