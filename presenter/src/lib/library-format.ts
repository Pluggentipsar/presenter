/**
 * Datum och relativa tider på startsidan.
 *
 * Allt räknas från `today`, som servern skickar med ("2026-09-21"), och i hela
 * UTC-dygn. Då ger servern och webbläsaren samma text — `Date.now()` och
 * `Intl` kan skilja mellan dem och ge hydreringsfel.
 */

const MONTHS = ["jan", "feb", "mars", "apr", "maj", "juni", "juli", "aug", "sep", "okt", "nov", "dec"];
const DAY_MS = 86_400_000;

export function isFullDate(date: string | undefined): date is string {
  return Boolean(date && /^\d{4}-\d{2}-\d{2}$/.test(date));
}

function dayNumber(isoDate: string): number {
  return Math.floor(Date.parse(`${isoDate}T00:00:00Z`) / DAY_MS);
}

/** "2026-09-24" → "24 sep 2026". Ett ofullständigt datum ("2026") visas som det står. */
export function formatDate(date: string | undefined, today: string): string {
  if (!date) return "";
  if (!isFullDate(date)) return date;
  const [year, month, day] = date.split("-").map(Number);
  const sameYear = String(year) === today.slice(0, 4);
  return `${day} ${MONTHS[month - 1] ?? ""}${sameYear ? "" : ` ${year}`}`;
}

/** Dagar till ett datum: 0 = i dag, negativt = passerat. null om datumet är ofullständigt. */
export function daysUntil(date: string | undefined, today: string): number | null {
  if (!isFullDate(date)) return null;
  return dayNumber(date) - dayNumber(today);
}

export function untilLabel(days: number): string {
  if (days === 0) return "i dag";
  if (days === 1) return "i morgon";
  if (days < 14) return `om ${days} dagar`;
  if (days < 60) return `om ${Math.round(days / 7)} veckor`;
  return `om ${Math.round(days / 30)} månader`;
}

export function changedLabel(updatedAtMs: number, today: string): string {
  if (!updatedAtMs) return "";
  const days = Math.max(0, dayNumber(today) - Math.floor(updatedAtMs / DAY_MS));
  if (days === 0) return "ändrad i dag";
  if (days === 1) return "ändrad i går";
  if (days < 14) return `ändrad för ${days} dagar sedan`;
  if (days < 60) return `ändrad för ${Math.round(days / 7)} veckor sedan`;
  if (days < 365) return `ändrad för ${Math.round(days / 30)} månader sedan`;
  return `ändrad för ${Math.round(days / 365)} år sedan`;
}

/** Sökbar text: gemener, utan accenter på annat än å, ä och ö. */
export function searchable(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}
