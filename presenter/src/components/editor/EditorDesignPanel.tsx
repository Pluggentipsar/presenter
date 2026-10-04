"use client";

/**
 * EditorDesignPanel — R-lägets designflik.
 *
 * Renderar exakt samma SlideDesignPanel som M-menyn, men med editorns egen
 * commit-adapter som callbacks. Öppnar samma slide i båda lägena ska visa
 * samma tillstånd — det är beviset för att lägena inte glidit isär.
 *
 * Panelen skriver ALDRIG genom en server action. Allt går via setParsed →
 * AuthoringShells autosave. Det är också mekaniskt spärrat via
 * no-restricted-imports i eslint.config.mjs.
 */

import { useMemo } from "react";
import type { ParsedComponent, PropValue } from "@/lib/mdx-parser";
import type { SlideGradientValue, SliderEffectValue } from "@/lib/types";
import { getTemplateSchemaOrFallback } from "@/lib/template-schemas";
import { getTheme } from "@/themes";
import { SlideDesignPanel } from "../design/SlideDesignPanel";
import type {
  ColorProp,
  ColorScope,
} from "../design/ColorOverridePicker";
import { SizePills } from "./SizePills";

interface EditorDesignPanelProps {
  slide: ParsedComponent;
  frontmatter: Record<string, unknown>;
  /** 0-indexerad position för aktuell slide. */
  slideIndex: number;
  onSetGradient: (value: SlideGradientValue | null) => void;
  onSetEffect: (value: SliderEffectValue | null) => void;
  onSetColor: (
    prop: ColorProp,
    value: string | null,
    scope: ColorScope,
  ) => void;
  onSetBackgroundColor: (cssValue: string) => void;
  onClearBackground: () => void;
  onSetOverlay: (overlay: number, mode: "dark" | "light") => void;
  onSetBlur: (px: number) => void;
  onPickBackgroundImage: () => void;
  onPickBackgroundVideo: () => void;
  onResetAll: () => void;
  onUpdateProps: (update: Record<string, PropValue>) => void;
  /** Sätt eller radera props (null / tom sträng raderar) — för av/på-brytare. */
  onApplyProps: (update: Record<string, PropValue | null>) => void;
}

function isOn(value: unknown): boolean {
  return value === true || value === "true";
}

/** Fri placering: symbolX/figureX finns som tal (skrivs av SlideDraggable). */
const isFree = (v: unknown) => (typeof v === "string" && v.trim() !== "" && !isNaN(parseFloat(v))) || typeof v === "number";

/** Markordets lägen — samma nycklar som SlideMark tar emot i markAlign. */
const MARK_PLACES: { key: string; label: string; title: string }[] = [
  { key: "bottom", label: "Nere", title: "Liggande längst ner (default)" },
  { key: "top", label: "Uppe", title: "Liggande överst" },
  { key: "center", label: "Mitten", title: "Liggande, vertikalt centrerat" },
  { key: "right", label: "Höger ↓", title: "Stående längs högerkanten, läses uppifrån" },
  { key: "left", label: "Vänster ↑", title: "Stående längs vänsterkanten, läses nedifrån" },
  { key: "stack-right", label: "Stapel H", title: "En bokstav per rad längs högerkanten" },
  { key: "stack-left", label: "Stapel V", title: "En bokstav per rad längs vänsterkanten" },
];

/** Två pills: På / Av. Samma formspråk som SizePills men för en boolean. */
function OnOff({
  on,
  onChange,
  disabled,
}: {
  on: boolean;
  onChange: (on: boolean) => void;
  disabled?: boolean;
}) {
  const base =
    "rounded-full px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors";
  return (
    <div className={"flex gap-1 " + (disabled ? "opacity-40" : "")}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(true)}
        className={base + (on ? " bg-white text-black" : " border border-white/20 text-white/60 hover:text-white")}
      >
        På
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(false)}
        className={base + (!on ? " bg-white text-black" : " border border-white/20 text-white/60 hover:text-white")}
      >
        Av
      </button>
    </div>
  );
}

function readMap(
  frontmatter: Record<string, unknown>,
  key: string,
): Record<string, unknown> | undefined {
  const raw = frontmatter[key];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  return raw as Record<string, unknown>;
}

function readHex(value: unknown): string | undefined {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value)
    ? value
    : undefined;
}

/**
 * Har sliden någon egen design alls? Styr accent-pricken på Design-fliken, så
 * Joel ser vilka slides som avviker utan att öppna panelen.
 */
export function slideHasDesignOverride(
  frontmatter: Record<string, unknown>,
  slide: ParsedComponent | undefined,
  slideIndex: number,
): boolean {
  const position = String(slideIndex + 1);
  const maps = [
    "slideGradients",
    "sliderEffects",
    "slideAccents",
    "slideTextColors",
    "slideMutedColors",
  ];
  if (maps.some((key) => readMap(frontmatter, key)?.[position] != null)) {
    return true;
  }
  if (
    isOn(slide?.props.markHidden) ||
    isOn(slide?.props.symbolHidden) ||
    isOn(slide?.props.figureHidden)
  ) {
    return true;
  }
  const background = slide?.props.background;
  return typeof background === "string" && background.trim() !== "";
}

export function EditorDesignPanel({
  slide,
  frontmatter,
  slideIndex,
  onSetGradient,
  onSetEffect,
  onSetColor,
  onSetBackgroundColor,
  onClearBackground,
  onSetOverlay,
  onSetBlur,
  onPickBackgroundImage,
  onPickBackgroundVideo,
  onResetAll,
  onUpdateProps,
  onApplyProps,
}: EditorDesignPanelProps) {
  const position = String(slideIndex + 1);

  // Markord & dekor — lagren som withSlideBg lägger runt mallen (mark=,
  // symbol=, figure=). Ordet redigeras här; av/på skriver *Hidden-props så
  // att ordet/bilden ligger kvar i MDX:en och kan tändas igen.
  const markValue = typeof slide.props.mark === "string" ? slide.props.mark : "";
  const markOn = !isOn(slide.props.markHidden);
  const markPlace =
    typeof slide.props.markAlign === "string" && MARK_PLACES.some((p) => p.key === slide.props.markAlign)
      ? String(slide.props.markAlign)
      : slide.props.markAlign === "tr"
        ? "top"
        : "bottom";
  const hasSymbol = typeof slide.props.symbol === "string" && slide.props.symbol.trim() !== "";
  const symbolOn = !isOn(slide.props.symbolHidden);
  const hasFigure = typeof slide.props.figure === "string" && slide.props.figure.trim() !== "";
  const figureOn = !isOn(slide.props.figureHidden);

  const gradient =
    (readMap(frontmatter, "slideGradients")?.[position] as
      | SlideGradientValue
      | undefined) ?? null;
  const effect =
    (readMap(frontmatter, "sliderEffects")?.[position] as
      | SliderEffectValue
      | undefined) ?? null;

  const background =
    typeof slide.props.background === "string"
      ? slide.props.background
      : undefined;
  const overlay =
    typeof slide.props.overlay === "string" ||
    typeof slide.props.overlay === "number"
      ? slide.props.overlay
      : undefined;
  const overlayMode =
    typeof slide.props.overlayMode === "string"
      ? slide.props.overlayMode
      : undefined;
  const backgroundBlur =
    typeof slide.props.backgroundBlur === "string" ||
    typeof slide.props.backgroundBlur === "number"
      ? slide.props.backgroundBlur
      : undefined;

  const themeBackground = getTheme(
    typeof frontmatter.theme === "string" ? frontmatter.theme : undefined,
  ).bg;

  // Storleks-genväg: Joel sa uttryckligen "kanske göra den större", och då ska
  // det gå att göra där han står — inte via en hänvisning till Fält-fliken.
  // Fälten läses ur template-schemat, samma källa som fältpanelen använder.
  const sizeFields = useMemo(() => {
    const { schema } = getTemplateSchemaOrFallback(
      slide.tag,
      slide.props as Record<string, unknown>,
      Boolean(slide.content && slide.content.trim().length > 0),
    );
    if (!schema) return [];
    return schema.fields.filter(
      (field) =>
        (field.variant === "pills" ||
          /Size$/.test(field.name) ||
          field.name === "size") &&
        (field.options?.length ?? 0) > 0,
    );
  }, [slide.tag, slide.props, slide.content]);

  return (
    <SlideDesignPanel
      background={background}
      overlay={overlay}
      overlayMode={overlayMode}
      blur={backgroundBlur}
      gradient={gradient}
      effect={effect}
      slideAccent={readHex(readMap(frontmatter, "slideAccents")?.[position])}
      slideText={readHex(readMap(frontmatter, "slideTextColors")?.[position])}
      slideMuted={readHex(readMap(frontmatter, "slideMutedColors")?.[position])}
      globalAccent={readHex(frontmatter.accentOverride)}
      globalText={readHex(frontmatter.textOverride)}
      globalMuted={readHex(frontmatter.mutedOverride)}
      themeBackground={themeBackground}
      onPickBackgroundImage={onPickBackgroundImage}
      onPickBackgroundVideo={onPickBackgroundVideo}
      onSetBackgroundColor={onSetBackgroundColor}
      onClearBackground={onClearBackground}
      onSetOverlay={onSetOverlay}
      onSetBlur={onSetBlur}
      onGradientChange={(value) => onSetGradient(value)}
      onEffectChange={(value) => onSetEffect(value)}
      onColorChange={onSetColor}
      onResetAll={onResetAll}
    >
      <div className="rounded-2xl border border-white/[0.12] bg-white/[0.05] p-4">
        <div className="text-sm font-medium text-white">Markord &amp; dekor</div>
        <div className="mt-0.5 text-xs text-white/65">
          Det massiva ordet bakom innehållet, symbolen och figuren. Symbolen och
          figuren kan dras direkt i förhandsvisningen; hörnhandtaget ändrar
          storlek. Av släcker
          lagret men behåller det i filen.
        </div>
        <div className="mt-3 flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/55">
              Markord
            </span>
            <input
              value={markValue}
              onChange={(event) => onApplyProps({ mark: event.target.value })}
              placeholder="ORD — tomt = inget"
              spellCheck={false}
              className="min-w-0 flex-1 rounded-lg border border-white/15 bg-transparent px-2 py-1 font-mono text-xs uppercase text-white outline-none placeholder:normal-case placeholder:text-white/30 focus:border-white/40"
            />
            <OnOff
              on={markOn}
              disabled={markValue.trim() === ""}
              onChange={(on) => onApplyProps({ markHidden: on ? null : "true" })}
            />
          </div>
          {markValue.trim() !== "" ? (
            <div className="flex items-start justify-between gap-3">
              <span className="pt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-white/55">
                Placering
              </span>
              <div className="flex flex-wrap justify-end gap-1">
                {MARK_PLACES.map((place) => {
                  const active = markPlace === place.key;
                  return (
                    <button
                      key={place.key}
                      type="button"
                      title={place.title}
                      onClick={() => onApplyProps({ markAlign: place.key === "bottom" ? null : place.key })}
                      className={
                        "rounded-full px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors " +
                        (active ? "bg-white text-black" : "border border-white/20 text-white/60 hover:text-white")
                      }
                    >
                      {place.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
          {hasSymbol ? (
            <div className="flex items-center justify-between gap-3">
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/55">
                Symbol
              </span>
              <span className="min-w-0 flex-1 truncate font-mono text-[10px] text-white/40">
                {String(slide.props.symbol).split("/").pop()}
              </span>
              {isFree(slide.props.symbolX) ? (
                <button
                  type="button"
                  onClick={() => onApplyProps({ symbolX: null, symbolY: null })}
                  title="Symbolen är fritt placerad (dragen i förhandsvisningen). Klicka för att gå tillbaka till läget."
                  className="rounded-full border border-white/20 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-white/70 hover:border-white/50 hover:text-white"
                >
                  Fri · till läge
                </button>
              ) : null}
              <OnOff
                on={symbolOn}
                onChange={(on) => onApplyProps({ symbolHidden: on ? null : "true" })}
              />
            </div>
          ) : null}
          {hasFigure ? (
            <div className="flex items-center justify-between gap-3">
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/55">
                Figur
              </span>
              <span className="min-w-0 flex-1 truncate font-mono text-[10px] text-white/40">
                {String(slide.props.figure).split("/").pop()}
              </span>
              {isFree(slide.props.figureX) ? (
                <button
                  type="button"
                  onClick={() => onApplyProps({ figureX: null, figureY: null })}
                  title="Figuren är fritt placerad (dragen i förhandsvisningen). Klicka för att gå tillbaka till läget."
                  className="rounded-full border border-white/20 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-white/70 hover:border-white/50 hover:text-white"
                >
                  Fri · till läge
                </button>
              ) : null}
              <OnOff
                on={figureOn}
                onChange={(on) => onApplyProps({ figureHidden: on ? null : "true" })}
              />
            </div>
          ) : null}
        </div>
      </div>
      {sizeFields.length > 0 ? (
        <div className="rounded-2xl border border-white/[0.12] bg-white/[0.05] p-4">
          <div className="text-sm font-medium text-white">Storlek</div>
          <div className="mt-0.5 text-xs text-white/65">
            Samma kontroller som under Fält — här för att slippa byta flik.
          </div>
          <div className="mt-3 flex flex-col gap-2">
            {sizeFields.map((field) => (
              <div
                key={field.name}
                className="flex items-center justify-between gap-3"
              >
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/55">
                  {field.label ?? field.name}
                </span>
                <SizePills
                  field={field}
                  value={slide.props[field.name]}
                  onChange={(value) => onUpdateProps({ [field.name]: value })}
                />
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </SlideDesignPanel>
  );
}
