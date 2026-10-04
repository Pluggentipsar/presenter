"use client";

/**
 * GradientPicker — palett, stil, rörelse, vinkel och egna färger.
 *
 * Ren kontroll: tar `value` (lagringsformen ur frontmatter) och rapporterar
 * ny lagringsform via `onChange`. Ingen server action, ingen router, ingen
 * timer. `continuous` är sant under slider-drag och färgväljar-drag så värden
 * kan välja att debounca disk-skrivningen utan att kontrollen behöver veta om
 * det.
 */

import { useMemo } from "react";
import {
  GRADIENT_PRESETS,
  buildGradientCss,
  resolveGradient,
  toStoredGradient,
  type GradientConfig,
  type GradientStyle,
} from "@/lib/gradient-presets";
import type { SlideGradientValue } from "@/lib/types";
import { EffectSlider, Segmented } from "./DesignPrimitives";

interface GradientPickerProps {
  value: SlideGradientValue | null;
  onChange: (value: SlideGradientValue | null, continuous?: boolean) => void;
  busy?: boolean;
}

export function GradientPicker({
  value,
  onChange,
  busy = false,
}: GradientPickerProps) {
  const config = useMemo(() => resolveGradient(value), [value]);

  const apply = (next: GradientConfig | null) =>
    onChange(toStoredGradient(next), false);
  const applyContinuous = (next: GradientConfig) =>
    onChange(toStoredGradient(next), true);

  const pickPreset = (presetId: string) => {
    const preset = GRADIENT_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    apply({
      colors: [...preset.colors],
      style: config?.style ?? "linear",
      angle: config?.angle ?? 135,
      animated: config?.animated ?? false,
      presetId: preset.id,
    });
  };

  // 3 färg-slots — paddade om aktiv config har färre färger
  const colorSlots: [string, string, string] = [
    config?.colors[0] ?? "#222230",
    config?.colors[1] ?? config?.colors[0] ?? "#444458",
    config?.colors[2] ?? config?.colors[1] ?? config?.colors[0] ?? "#7a7a96",
  ];

  const setColor = (idx: number, hex: string) => {
    if (!config) return;
    const colors: string[] = [...colorSlots];
    colors[idx] = hex;
    // Egen färg → gradienten är inte längre "en preset"
    applyContinuous({ ...config, colors, presetId: undefined });
  };

  const swatchStyle = config?.style ?? "linear";

  return (
    <div className="rounded-2xl border border-white/[0.12] bg-white/[0.05] p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-white">
            Gradient-bakgrund
          </div>
          <div className="mt-0.5 text-xs text-white/65">
            Färgrik bakgrund bakom slidens innehåll — välj en palett.
          </div>
        </div>
        <button
          type="button"
          onClick={() => apply(null)}
          disabled={busy}
          className={`shrink-0 rounded-md border px-3 py-1 text-[10px] uppercase tracking-[0.2em] transition-all ${
            config === null
              ? "border-accent bg-accent/[0.12] text-accent"
              : "border-white/15 bg-white/[0.04] text-white/65 hover:border-accent hover:bg-accent/[0.08] hover:text-accent"
          }`}
        >
          Ingen
        </button>
      </div>

      {/* Live-förhandsvisning av aktiv gradient */}
      {config ? (
        <div
          className="mb-3 flex h-16 items-end overflow-hidden rounded-xl border border-white/10 p-2"
          style={{ background: buildGradientCss(config) }}
        >
          <span className="rounded-md bg-black/35 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-white/90 backdrop-blur-sm">
            {config.style === "mesh" ? "Mesh" : "Linjär"}
            {config.animated ? " · animerad" : ""}
          </span>
        </div>
      ) : null}

      {/* Preset-paletter */}
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
        {GRADIENT_PRESETS.map((preset) => {
          const active = config?.presetId === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => pickPreset(preset.id)}
              disabled={busy}
              title={preset.label}
              className={`group flex flex-col items-stretch gap-1 rounded-lg border p-1 text-left transition-all ${
                active
                  ? "border-accent bg-accent/[0.12] shadow-[0_0_24px_-8px_var(--accent)]"
                  : "border-white/[0.10] bg-white/[0.03] hover:border-accent/40"
              }`}
            >
              <span
                aria-hidden
                className="h-8 w-full rounded-md"
                style={{
                  background: buildGradientCss({
                    colors: preset.colors,
                    style: swatchStyle,
                    angle: config?.angle ?? 135,
                    animated: false,
                  }),
                }}
              />
              <span
                className={`truncate text-[10px] ${
                  active ? "text-accent" : "text-white/70"
                }`}
              >
                {preset.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Kontroller — bara när en gradient är aktiv */}
      {config ? (
        <div className="mt-4 space-y-3 border-t border-white/[0.06] pt-3">
          {/* Stil + Rörelse */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-[0.22em] text-white/55">
                Stil
              </span>
              <Segmented
                options={[
                  { id: "linear", label: "Linjär" },
                  { id: "mesh", label: "Mesh" },
                ]}
                value={config.style}
                onChange={(v) =>
                  apply({ ...config, style: v as GradientStyle })
                }
                disabled={busy}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-[0.22em] text-white/55">
                Rörelse
              </span>
              <Segmented
                options={[
                  { id: "off", label: "Av" },
                  { id: "on", label: "På" },
                ]}
                value={config.animated ? "on" : "off"}
                onChange={(v) => apply({ ...config, animated: v === "on" })}
                disabled={busy}
              />
            </div>
          </div>

          {/* Vinkel — bara relevant för linjär stil */}
          {config.style === "linear" ? (
            <EffectSlider
              label="Vinkel"
              min={0}
              max={360}
              step={5}
              value={config.angle}
              isCustom={config.angle !== 135}
              format={(v) => `${Math.round(v)}°`}
              onInput={(v) => applyContinuous({ ...config, angle: v })}
              onReset={() => apply({ ...config, angle: 135 })}
              resetTitle="Återställ vinkel (135°)"
              disabled={busy}
            />
          ) : null}

          {/* Egna färger */}
          <div className="flex items-center gap-2.5">
            <span className="w-16 text-[10px] uppercase tracking-[0.22em] text-white/55">
              Färger
            </span>
            <div className="flex items-center gap-2">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="relative block h-8 w-8 overflow-hidden rounded-full border-2 border-white/20 transition-colors hover:border-white/60"
                >
                  <input
                    type="color"
                    value={colorSlots[i]}
                    onChange={(e) => setColor(i, e.currentTarget.value)}
                    disabled={busy}
                    aria-label={`Färg ${i + 1}`}
                    className="absolute left-1/2 top-1/2 h-[220%] w-[220%] -translate-x-1/2 -translate-y-1/2 cursor-pointer border-0 bg-transparent p-0"
                  />
                </span>
              ))}
            </div>
            <span className="text-[10px] text-white/40">
              {config.presetId ? "Klicka för egen färg" : "Egen palett"}
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
