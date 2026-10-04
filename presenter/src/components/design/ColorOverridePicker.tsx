"use client";

/**
 * ColorOverridePicker — accent, text och dämpad text, per slide eller globalt.
 *
 * Ren kontroll. Återställning sker alltid genom att RADERA värdet, aldrig
 * genom att skriva in temats hex: skriven hex låser sliden om Joel byter tema
 * senare, och då är "återställ" inte längre sant.
 */

import { useState } from "react";
import {
  ACCENT_SWATCHES,
  ColorRow,
  MUTED_SWATCHES,
  TEXT_SWATCHES,
  type ValueSource,
} from "./DesignPrimitives";

export type ColorScope = "slide" | "all";
export type ColorProp = "accent" | "text" | "muted";

interface ColorOverridePickerProps {
  scope: ColorScope;
  onScopeChange: (scope: ColorScope) => void;
  slideAccent?: string;
  slideText?: string;
  slideMuted?: string;
  globalAccent?: string;
  globalText?: string;
  globalMuted?: string;
  onApply: (prop: ColorProp, value: string | null, scope: ColorScope) => void;
  busy?: boolean;
  /** Hex för det som faktiskt ligger bakom texten (gradientens medelfärg eller temats bg). */
  contrastAgainst?: string;
  /** Sant när siffran är en uppskattning (gradient/bild bakom). */
  contrastApproximate?: boolean;
}

export function ColorOverridePicker({
  scope,
  onScopeChange,
  slideAccent,
  slideText,
  slideMuted,
  globalAccent,
  globalText,
  globalMuted,
  onApply,
  busy = false,
  contrastAgainst,
  contrastApproximate = false,
}: ColorOverridePickerProps) {
  const [accentHex, setAccentHex] = useState("");
  const [textHex, setTextHex] = useState("");
  const [mutedHex, setMutedHex] = useState("");

  const currentAccent = scope === "slide" ? slideAccent : globalAccent;
  const currentText = scope === "slide" ? slideText : globalText;
  const currentMuted = scope === "slide" ? slideMuted : globalMuted;

  // Vilken nivå det synliga värdet kommer ifrån. I slide-scope kan ett × landa
  // på den globala färgen i stället för på temat — badgen säger vilket.
  const sourceOf = (slideValue?: string, globalValue?: string): ValueSource => {
    if (scope === "slide" && slideValue) return "slide";
    if (globalValue) return "global";
    return "theme";
  };

  const apply = (prop: ColorProp, value: string | null) =>
    onApply(prop, value, scope);

  const isHex = (v: string) => /^#[0-9a-fA-F]{6}$/.test(v);

  return (
    <div
      className="rounded-xl border border-white/[0.10] bg-white/[0.025] p-3"
      aria-label="Färgöverskrivning"
    >
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div
            aria-hidden
            className="grid h-5 w-5 grid-cols-2 grid-rows-2 overflow-hidden rounded-sm"
            style={{ boxShadow: "0 0 0 1px rgba(255,255,255,0.15)" }}
          >
            <span style={{ background: currentAccent ?? "var(--accent)" }} />
            <span style={{ background: currentText ?? "var(--text)" }} />
            <span style={{ background: currentText ?? "var(--text)" }} />
            <span style={{ background: currentAccent ?? "var(--accent)" }} />
          </div>
          <span className="text-[11px] uppercase tracking-[0.22em] text-white/70">
            Färger
          </span>
        </div>
        <div className="flex rounded-md border border-white/10 p-0.5 text-[10px]">
          <button
            type="button"
            onClick={() => onScopeChange("slide")}
            className={`rounded-[3px] px-2 py-1 uppercase tracking-[0.18em] transition-colors ${
              scope === "slide"
                ? "bg-accent/[0.18] text-accent"
                : "text-white/55 hover:text-white/85"
            }`}
          >
            Denna slide
          </button>
          <button
            type="button"
            onClick={() => onScopeChange("all")}
            className={`rounded-[3px] px-2 py-1 uppercase tracking-[0.18em] transition-colors ${
              scope === "all"
                ? "bg-accent/[0.18] text-accent"
                : "text-white/55 hover:text-white/85"
            }`}
          >
            Alla slides
          </button>
        </div>
      </div>

      {/* Accent-rad */}
      <ColorRow
        label="Accent"
        currentValue={currentAccent}
        swatches={ACCENT_SWATCHES}
        hexInput={accentHex}
        onHexInput={setAccentHex}
        onApplySwatch={(c) => apply("accent", c)}
        onApplyCustom={() => {
          if (isHex(accentHex)) apply("accent", accentHex);
        }}
        onReset={() => apply("accent", null)}
        busy={busy}
        cssVar="--accent"
        source={sourceOf(slideAccent, globalAccent)}
      />

      {/* Text-rad */}
      <div className="mt-2">
        <ColorRow
          label="Text"
          currentValue={currentText}
          swatches={TEXT_SWATCHES}
          hexInput={textHex}
          onHexInput={setTextHex}
          onApplySwatch={(c) => apply("text", c)}
          onApplyCustom={() => {
            if (isHex(textHex)) apply("text", textHex);
          }}
          onReset={() => apply("text", null)}
          busy={busy}
          cssVar="--text"
          contrastAgainst={contrastAgainst}
          contrastApproximate={contrastApproximate}
          source={sourceOf(slideText, globalText)}
          onQuickContrast={(hex) => apply("text", hex)}
        />
      </div>

      {/* Muted-rad (eyebrows, captions, source) */}
      <div className="mt-2">
        <ColorRow
          label="Muted"
          currentValue={currentMuted}
          swatches={MUTED_SWATCHES}
          hexInput={mutedHex}
          onHexInput={setMutedHex}
          onApplySwatch={(c) => apply("muted", c)}
          onApplyCustom={() => {
            if (isHex(mutedHex)) apply("muted", mutedHex);
          }}
          onReset={() => apply("muted", null)}
          busy={busy}
          cssVar="--text-muted"
          contrastAgainst={contrastAgainst}
          contrastApproximate={contrastApproximate}
          source={sourceOf(slideMuted, globalMuted)}
          onQuickContrast={(hex) => apply("muted", hex)}
        />
      </div>
    </div>
  );
}
