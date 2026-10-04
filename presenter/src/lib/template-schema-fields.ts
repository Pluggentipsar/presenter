/**
 * Fält som återkommer i nästan alla mallar, med samma ord varje gång.
 * Delas av template-schemas-vanliga.ts och template-schemas-modeller.ts.
 * Ren modul: importerar bara typer.
 */

import type { FieldSchema } from "./template-schemas";

export const chapter: FieldSchema = {
  name: "chapter",
  label: "Kapitel",
  type: "text",
  placeholder: "§ 2 · Fusket",
  hint: "Liten markör i slidens hörn.",
};

export const kicker: FieldSchema = { name: "kicker", label: "Kicker", type: "text", hint: "Liten rad ovanför rubriken." };

export const accent: FieldSchema = {
  name: "accent",
  label: "Accentfärg",
  type: "color",
  advanced: true,
  hint: "Färgen på **fet** text. Tomt = temats accent.",
};

export const background: FieldSchema = {
  name: "background",
  label: "Bakgrund",
  type: "image",
  advanced: true,
  hint: "Bild, video eller CSS-färg. Designfliken har väljare och reglage för samma sak.",
};

export const overlay = (standard?: string): FieldSchema => ({
  name: "overlay",
  label: "Mörkläggning av bakgrunden",
  type: "text",
  advanced: true,
  placeholder: standard ?? "0–1",
  hint: standard ? `0 = ingen, 1 = helt mörk. Standard ${standard}.` : "0 = ingen, 1 = helt mörk.",
});

/** Samma sak under ett annat namn: några mallar kallar mörkläggningen `darken`. */
export const darken = (standard: string): FieldSchema => ({
  name: "darken",
  label: "Mörkläggning av bakgrunden",
  type: "number",
  advanced: true,
  placeholder: standard,
  hint: `0 = ingen, 1 = helt mörk. Standard ${standard}.`,
});
