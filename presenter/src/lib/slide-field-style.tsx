"use client";

import { createContext, useContext, useMemo } from "react";
import type { CSSProperties, ReactNode } from "react";

/**
 * Textfärg per FÄLT, utan att röra en enda mall.
 *
 * Problemet: en slide kan ha mörk text över ett mörkt foto samtidigt som den
 * har vita kort som behöver mörk text. En slide-övergripande textfärg löser
 * bara det ena och förstör det andra.
 *
 * Lösningen bygger på att mallarna redan följer DESIGN.md och sätter
 * `color: var(--text)` i stället för hårdkodade färger. Sätter man om
 * `--text` på ett element ärver allt under det den nya färgen — och ett
 * element med `display: contents` ärver ner utan att lägga sig i layouten.
 *
 * Så: fältets färg lagras som `<fält>Color` på sliden (`titleColor`,
 * `subtitleColor`), `withSlideBg` gör slidens props tillgängliga här, och
 * `EditableText` slår upp sitt eget fält och wrappar barnen. Mallen vet
 * ingenting om det.
 *
 * `--text-muted` sätts om samtidigt: väljer man en färg för ett fält ska den
 * gälla oavsett vilken av variablerna mallen råkar använda. `--accent` lämnas
 * i fred — det är en textfärg man sätter, inte temats signatur.
 */

type SlideFieldProps = Record<string, unknown>;

const SlideFieldStyleContext = createContext<SlideFieldProps>({});

interface SlideFieldStyleProviderProps {
  /** Slidens props. `children` strippas — bara skalära fält är intressanta. */
  props: SlideFieldProps;
  children: ReactNode;
}

export function SlideFieldStyleProvider({
  props,
  children,
}: SlideFieldStyleProviderProps) {
  const value = useMemo(() => {
    const out: SlideFieldProps = {};
    for (const [k, v] of Object.entries(props)) {
      // Bara *Color-fälten behövs, och de är alltid strängar. Att filtrera
      // här håller kontextvärdet stabilt mellan renderingar även när
      // mallen får nya barn.
      if (k.endsWith("Color") && typeof v === "string" && v.trim() !== "") {
        out[k] = v.trim();
      }
    }
    return out;
  }, [props]);

  return (
    <SlideFieldStyleContext.Provider value={value}>
      {children}
    </SlideFieldStyleContext.Provider>
  );
}

/** Propnamnet ett fälts färg lagras under. `title` → `titleColor`. */
export function fieldColorProp(path: string): string {
  return `${path}Color`;
}

/**
 * Färgen för ett fält, om någon är satt.
 *
 * Returnerar också den style som ska läggas på wrappern. `display: contents`
 * gör att wrappern inte finns i layouten men fortfarande ärver ner variabeln.
 */
export function useFieldColor(path: string): {
  color?: string;
  wrapperStyle?: CSSProperties;
} {
  const props = useContext(SlideFieldStyleContext);
  const color = props[fieldColorProp(path)];
  if (typeof color !== "string" || !color) return {};
  return {
    color,
    wrapperStyle: {
      display: "contents",
      ["--text" as string]: color,
      ["--text-muted" as string]: color,
      color,
    } as CSSProperties,
  };
}

/** Valen i färgväljaren. Samma fyra som på fria textrutor. */
export const FIELD_TEXT_COLORS = [
  { label: "Tema", value: "", swatch: "var(--text)", title: "Temats textfärg" },
  { label: "Vit", value: "#FFFFFF", swatch: "#FFFFFF", title: "Vit — för mörk bakgrund" },
  { label: "Svart", value: "#0A0908", swatch: "#0A0908", title: "Svart — för ljus bakgrund" },
  { label: "Accent", value: "var(--accent)", swatch: "var(--accent)", title: "Temats accentfärg" },
] as const;
