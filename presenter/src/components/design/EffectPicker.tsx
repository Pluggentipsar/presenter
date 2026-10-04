"use client";

/**
 * EffectPicker — per-slide bakgrundsrörelse (dots, flow, aurora …).
 *
 * Ren kontroll, samma kontrakt som GradientPicker: `value` in, lagringsform ut.
 * `continuous` är sant medan en slider dras.
 */

import {
  SLIDE_EFFECT_OPTIONS,
  SLIDE_EFFECT_COLOR_PRESETS,
  type SlideEffect,
} from "../SlideEffectLayer";
import type { SliderEffectValue } from "@/lib/types";
import { EffectSlider, getEffectSwatchStyle } from "./DesignPrimitives";

interface EffectState {
  kind: SlideEffect | null;
  color: string | null;
  opacity: number | null;
  speed: number | null;
}

/** Lagrad form → uppackat tillstånd. */
export function unpackEffect(value: SliderEffectValue | null): EffectState {
  if (!value) return { kind: null, color: null, opacity: null, speed: null };
  if (typeof value === "string") {
    return {
      kind: value as SlideEffect,
      color: null,
      opacity: null,
      speed: null,
    };
  }
  return {
    kind: value.kind as SlideEffect,
    color: value.color ?? null,
    opacity: value.opacity ?? null,
    speed: value.speed ?? null,
  };
}

/**
 * Uppackat tillstånd → lagrad form. Kort-form (ren sträng) när inget extra är
 * satt, precis som mdx.ts läser den — annars skulle samma effekt skrivas på
 * två sätt beroende på vilket läge Joel råkade stå i.
 */
export function toStoredEffect(state: EffectState): SliderEffectValue | null {
  if (!state.kind) return null;
  if (state.color == null && state.opacity == null && state.speed == null) {
    return state.kind;
  }
  return {
    kind: state.kind,
    ...(state.color != null ? { color: state.color } : {}),
    ...(state.opacity != null ? { opacity: state.opacity } : {}),
    ...(state.speed != null ? { speed: state.speed } : {}),
  };
}

interface EffectPickerProps {
  value: SliderEffectValue | null;
  onChange: (value: SliderEffectValue | null, continuous?: boolean) => void;
  busy?: boolean;
}

export function EffectPicker({
  value,
  onChange,
  busy = false,
}: EffectPickerProps) {
  const state = unpackEffect(value);
  const { kind: currentKind, color: currentColor } = state;
  const { opacity: currentOpacity, speed: currentSpeed } = state;

  const apply = (next: EffectState) => onChange(toStoredEffect(next), false);
  const applyContinuous = (next: EffectState) =>
    onChange(toStoredEffect(next), true);

  // Normalisera "default" → null så vi inte sparar onödiga 1.0-värden i YAML
  const normalize = (v: number, defaultVal = 1): number | null =>
    Math.abs(v - defaultVal) < 0.025 ? null : Math.round(v * 100) / 100;

  // Vad slidrarna ska visa när inget värde är satt
  const displayOpacity = currentOpacity ?? 1;
  const displaySpeed = currentSpeed ?? 1;

  return (
    <div className="rounded-2xl border border-white/[0.12] bg-white/[0.05] p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-white">Bakgrunds-rörelse</div>
          <div className="mt-0.5 text-xs text-white/65">
            Diskret animation bakom innehållet — skapar liv utan att ta över.
          </div>
        </div>
        <button
          type="button"
          onClick={() =>
            apply({ kind: null, color: null, opacity: null, speed: null })
          }
          disabled={busy}
          className={`rounded-md border px-3 py-1 text-[10px] uppercase tracking-[0.2em] transition-all ${
            currentKind === null
              ? "border-accent bg-accent/[0.12] text-accent"
              : "border-white/15 bg-white/[0.04] text-white/65 hover:border-accent hover:bg-accent/[0.08] hover:text-accent"
          }`}
        >
          Ingen
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {SLIDE_EFFECT_OPTIONS.map((opt) => {
          const active = currentKind === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => apply({ ...state, kind: opt.id })}
              disabled={busy}
              title={opt.hint}
              className={`group flex flex-col items-start gap-1.5 rounded-lg border p-2.5 text-left transition-all ${
                active
                  ? "border-accent bg-accent/[0.12] shadow-[0_0_24px_-8px_var(--accent)]"
                  : "border-white/[0.10] bg-white/[0.03] hover:border-accent/40 hover:bg-white/[0.08]"
              }`}
            >
              <span
                aria-hidden
                className="h-10 w-full overflow-hidden rounded-md"
                style={getEffectSwatchStyle(opt.id, currentColor)}
              />
              <span
                className={`text-xs ${active ? "text-accent" : "text-white/85"}`}
              >
                {opt.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Färgväljare + slidrar — visas bara när en effekt är aktiv */}
      {currentKind !== null ? (
        <div className="mt-4 space-y-3 border-t border-white/[0.06] pt-3">
          {/* Färg-presets */}
          <div className="flex items-center gap-2.5">
            <div className="w-16 text-[10px] uppercase tracking-[0.22em] text-white/55">
              Färg
            </div>
            <div className="flex flex-wrap gap-1.5">
              {SLIDE_EFFECT_COLOR_PRESETS.map((preset) => {
                const active = (currentColor ?? null) === preset.hex;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => apply({ ...state, color: preset.hex })}
                    disabled={busy}
                    title={preset.label}
                    aria-label={preset.label}
                    className={`flex h-7 w-7 items-center justify-center rounded-full border-2 transition-all ${
                      active
                        ? "border-white scale-110"
                        : "border-white/20 hover:border-white/60"
                    }`}
                    style={{
                      background: preset.hex
                        ? preset.hex
                        : "linear-gradient(135deg, var(--accent), var(--ornament-color, #8884))",
                    }}
                  >
                    {!preset.hex && (
                      <span className="text-[8px] font-bold text-white drop-shadow">
                        A
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Synlighet (opacity) — 0.2 till 1.5 */}
          <EffectSlider
            label="Synlighet"
            min={0.2}
            max={1.5}
            value={displayOpacity}
            isCustom={currentOpacity !== null}
            format={(v) => `${Math.round(v * 100)}%`}
            onInput={(v) =>
              applyContinuous({ ...state, opacity: normalize(v) })
            }
            onReset={() => apply({ ...state, opacity: null })}
            disabled={busy}
          />

          {/* Rörelse (speed) — 0.3 till 2.5 */}
          <EffectSlider
            label="Rörelse"
            min={0.3}
            max={2.5}
            value={displaySpeed}
            isCustom={currentSpeed !== null}
            format={(v) => `${v.toFixed(2)}×`}
            onInput={(v) => applyContinuous({ ...state, speed: normalize(v) })}
            onReset={() => apply({ ...state, speed: null })}
            disabled={busy}
          />
        </div>
      ) : null}
    </div>
  );
}
