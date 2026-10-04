import { AGARE } from "@/lib/agare";

/**
 * Standardtexten "Om föreläsaren" på delningspaketets landningssida.
 * Gemensam för alla delade föreläsningar. Uppgifterna står i lib/agare.ts.
 */
export const SHARE_AUTHOR = {
  name: AGARE.namn,
  bio: AGARE.bio,
  links: AGARE.lankar,
};

export function formatShareDate(date: string | undefined): string | undefined {
  if (!date) return undefined;
  // Bara ett år (”2026”) eller år och månad (”2026-09”): visa det som står.
  // Annars fyller Date i den första januari, som ingen har skrivit.
  if (/^\d{4}$/.test(date)) return date;
  const month = date.match(/^(\d{4})-(\d{2})$/);
  if (month) return new Intl.DateTimeFormat("sv-SE", { month: "long", year: "numeric" }).format(new Date(Number(month[1]), Number(month[2]) - 1, 15));
  const parsed = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return new Intl.DateTimeFormat("sv-SE", { day: "numeric", month: "long", year: "numeric" }).format(parsed);
}
