"use client";

/**
 * BackgroundControls — slidens `background`-prop: bild, video, platt färg
 * eller ingenting, plus overlay-tonen ovanpå.
 *
 * Ren kontroll. All lagring är EN prop (`background`) — withSlideBg tolkar
 * själv om värdet är en bild, en video eller ett godtyckligt CSS-värde, så
 * platt färg behöver ingen ny nyckel i frontmattern.
 */

import { OVERLAY_PRESETS } from "@/lib/background";
import { EffectSlider } from "./DesignPrimitives";

/** Handplockade platta bakgrunder. Mörka först — det är Joels vanliga behov. */
const FLAT_COLORS: { hex: string; label: string }[] = [
  { hex: "#0A0A0F", label: "Nästan svart" },
  { hex: "#101418", label: "Mörk grafit" },
  { hex: "#151221", label: "Mörk plommon" },
  { hex: "#0B1F1A", label: "Mörk skog" },
  { hex: "#1A1410", label: "Mörk mocka" },
  { hex: "#F7F1E6", label: "Cream" },
  { hex: "#FFFFFF", label: "Ren vit" },
];

export type BackgroundKind = "none" | "image" | "video" | "color";

export function backgroundKind(background?: string): BackgroundKind {
  const value = background?.trim();
  if (!value) return "none";
  if (/\.(mp4|webm|mov)(\?|$)/i.test(value)) return "video";
  if (value.startsWith("/") || value.startsWith("http")) return "image";
  return "color";
}

interface BackgroundControlsProps {
  background?: string;
  overlay?: string | number;
  overlayMode?: string;
  /** Oskärpa på bakgrundslagret i px (slide-propen `backgroundBlur`). */
  blur?: string | number;
  /** Sant när sliden också har en gradient — då varnar vi, för propen målar över. */
  hasGradient: boolean;
  onPickImage: () => void;
  onPickVideo: () => void;
  onSetColor: (cssValue: string) => void;
  onClear: () => void;
  onSetOverlay: (overlay: number, mode: "dark" | "light") => void;
  /** Utelämnad → oskärpe-kontrollen visas inte (läge utan lagringsväg). */
  onSetBlur?: (px: number) => void;
  busy?: boolean;
}

export function BackgroundControls({
  background,
  overlay,
  overlayMode,
  blur,
  hasGradient,
  onPickImage,
  onPickVideo,
  onSetColor,
  onClear,
  onSetOverlay,
  onSetBlur,
  busy = false,
}: BackgroundControlsProps) {
  const kind = backgroundKind(background);
  const blurNum = typeof blur === "string" ? parseFloat(blur) : blur ?? 0;
  const blurPx = Number.isFinite(blurNum) ? Math.max(0, blurNum as number) : 0;
  const overlayNum =
    typeof overlay === "string" ? parseFloat(overlay) : overlay ?? 0;
  const hasOverlay = Number.isFinite(overlayNum) && (overlayNum as number) > 0;
  const activeOverlayId = hasOverlay
    ? OVERLAY_PRESETS.find(
        (p) =>
          Math.abs(p.overlay - (overlayNum as number)) < 0.01 &&
          p.mode === (overlayMode === "light" ? "light" : "dark"),
      )?.id
    : undefined;

  return (
    <div className="rounded-2xl border border-white/[0.12] bg-white/[0.05] p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-white">Bakgrund</div>
          <div className="mt-0.5 text-xs text-white/65">
            Bild, video eller en platt färg bakom hela sliden.
          </div>
        </div>
        <button
          type="button"
          onClick={onClear}
          disabled={busy || kind === "none"}
          title="Ta bort bakgrunden och gå tillbaka till temats default"
          className={`shrink-0 rounded-md border px-3 py-1 text-[10px] uppercase tracking-[0.2em] transition-all ${
            kind === "none"
              ? "border-accent bg-accent/[0.12] text-accent"
              : "border-white/15 bg-white/[0.04] text-white/65 hover:border-accent hover:bg-accent/[0.08] hover:text-accent"
          } disabled:cursor-not-allowed`}
        >
          Ingen
        </button>
      </div>

      {/* Aktuellt värde — så man ser vad som faktiskt är satt, inte bara att
          något är satt. Sökvägar blir långa; låt dem brytas. */}
      {kind !== "none" ? (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-white/[0.10] bg-white/[0.03] p-2">
          <span
            aria-hidden
            className="h-9 w-9 shrink-0 rounded-md border border-white/10"
            style={{
              background:
                kind === "color"
                  ? background
                  : kind === "image"
                    ? `url('${background}') center/cover no-repeat`
                    : "linear-gradient(135deg, #1f2937, #0f172a)",
            }}
          />
          <div className="min-w-0 flex-1">
            <div className="text-[10px] uppercase tracking-[0.22em] text-white/55">
              {kind === "image"
                ? "Bild"
                : kind === "video"
                  ? "Video"
                  : "Platt färg"}
            </div>
            <div className="truncate font-mono text-[10px] text-white/70">
              {background}
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <BgButton
          active={kind === "image"}
          disabled={busy}
          onClick={onPickImage}
          label="Bild"
          hint="Ladda upp eller URL"
        />
        <BgButton
          active={kind === "video"}
          disabled={busy}
          onClick={onPickVideo}
          label="Video"
          hint="Loopar tyst i bakgrunden"
        />
        <BgButton
          active={kind === "color"}
          disabled={busy}
          onClick={() => onSetColor(FLAT_COLORS[1].hex)}
          label="Färg"
          hint="Platt yta, valfri ton"
        />
      </div>

      {/* Platt-färg-paletten. Egen färgväljare sist för allt annat. */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <span className="w-16 text-[10px] uppercase tracking-[0.22em] text-white/55">
          Ton
        </span>
        {FLAT_COLORS.map((c) => {
          const active =
            kind === "color" &&
            background?.toLowerCase() === c.hex.toLowerCase();
          return (
            <button
              key={c.hex}
              type="button"
              disabled={busy}
              onClick={() => onSetColor(c.hex)}
              title={`${c.label} (${c.hex})`}
              aria-label={c.label}
              className={`h-6 w-6 rounded-full transition-transform hover:scale-110 ${
                active ? "scale-110" : ""
              }`}
              style={{
                background: c.hex,
                boxShadow: active
                  ? `0 0 18px ${c.hex}aa, 0 0 0 2px #FFFFFF`
                  : "0 0 0 1px rgba(255,255,255,0.18)",
              }}
            />
          );
        })}
        <span className="relative block h-6 w-6 overflow-hidden rounded-full border-2 border-white/20 transition-colors hover:border-white/60">
          <input
            type="color"
            value={kind === "color" ? (background as string) : "#101418"}
            onChange={(e) => onSetColor(e.currentTarget.value)}
            disabled={busy}
            aria-label="Egen bakgrundsfärg"
            className="absolute left-1/2 top-1/2 h-[220%] w-[220%] -translate-x-1/2 -translate-y-1/2 cursor-pointer border-0 bg-transparent p-0"
          />
        </span>
      </div>

      {/* Overlay — tonar ner (eller upp) bakgrunden bakom texten. */}
      <div className="mt-4 border-t border-white/[0.06] pt-3">
        <div className="mb-2 flex items-center justify-between gap-3">
          <div>
            <div className="text-xs font-medium text-white">Overlay</div>
            <div className="mt-0.5 text-[11px] text-white/60">
              Töna ner (eller upp) bakgrunden för bättre läsbarhet.
            </div>
          </div>
          <button
            type="button"
            onClick={() => onSetOverlay(0, "dark")}
            disabled={busy}
            className={`rounded-md border px-3 py-1 text-[10px] uppercase tracking-[0.2em] transition-all ${
              hasOverlay
                ? "border-white/15 bg-white/[0.04] text-white/65 hover:border-accent hover:bg-accent/[0.08] hover:text-accent"
                : "border-accent bg-accent/[0.12] text-accent"
            }`}
          >
            Ingen
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {OVERLAY_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              disabled={busy}
              onClick={() => onSetOverlay(p.overlay, p.mode)}
              className={`group flex items-center gap-2.5 rounded-lg border p-2 text-left transition-all ${
                activeOverlayId === p.id
                  ? "border-accent bg-accent/[0.12]"
                  : "border-white/[0.10] bg-white/[0.03] hover:border-accent/40 hover:bg-white/[0.08]"
              }`}
            >
              <span
                aria-hidden
                className="h-7 w-7 shrink-0 rounded-md"
                style={{
                  background:
                    p.mode === "dark"
                      ? `linear-gradient(rgba(0,0,0,${p.overlay}), rgba(0,0,0,${p.overlay})), linear-gradient(135deg, #6b46c1, #ec4899)`
                      : `linear-gradient(rgba(255,255,255,${p.overlay}), rgba(255,255,255,${p.overlay})), linear-gradient(135deg, #6b46c1, #ec4899)`,
                  boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)",
                }}
              />
              <span className="text-xs text-white/85">{p.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Oskärpa — suddar bara bakgrundslagret, aldrig innehållet.
          Visas enbart för bild/video: en platt färg blir inte suddigare. */}
      {onSetBlur && (kind === "image" || kind === "video") ? (
        <div className="mt-4 border-t border-white/[0.06] pt-3">
          <div className="mb-2">
            <div className="text-xs font-medium text-white">Oskärpa</div>
            <div className="mt-0.5 text-[11px] text-white/60">
              Sudda bakgrunden så texten kliver fram. 0 = av.
            </div>
          </div>
          <EffectSlider
            label="Blur"
            min={0}
            max={24}
            step={1}
            value={blurPx}
            isCustom={blurPx > 0}
            format={(v) => `${Math.round(v)} px`}
            onInput={(v) => onSetBlur(Math.round(v))}
            onReset={() => onSetBlur(0)}
            resetTitle="Ta bort oskärpan"
            disabled={busy}
          />
        </div>
      ) : null}

      {/* Härledd ur slidens faktiska props — aldrig ur en lista över templates.
          En sådan lista blir fel så fort någon skriver en ny template. */}
      {hasGradient && kind !== "none" ? (
        <div className="mt-3 flex items-start gap-1.5 rounded-lg border border-yellow-300/30 bg-yellow-300/[0.08] p-2 text-[11px] text-yellow-200/90">
          <span aria-hidden>⚠️</span>
          <span>
            Sliden har både gradient och bakgrund. Bakgrunden målas ovanpå
            gradienten, så gradienten syns inte. Ta bort den ena.
          </span>
        </div>
      ) : null}
    </div>
  );
}

function BgButton({
  active,
  disabled,
  onClick,
  label,
  hint,
}: {
  active: boolean;
  disabled: boolean;
  onClick: () => void;
  label: string;
  hint: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={hint}
      className={`flex flex-col items-start gap-0.5 rounded-lg border p-2.5 text-left transition-all ${
        active
          ? "border-accent bg-accent/[0.12]"
          : "border-white/[0.10] bg-white/[0.03] hover:border-accent/40 hover:bg-white/[0.08]"
      }`}
    >
      <span className={`text-xs ${active ? "text-accent" : "text-white/85"}`}>
        {label}
      </span>
      <span className="text-[10px] text-white/50">{hint}</span>
    </button>
  );
}
