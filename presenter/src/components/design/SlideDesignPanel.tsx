"use client";

/**
 * SlideDesignPanel — hela designytan för EN slide, som en stapel kort.
 *
 * Panelen renderas av både M-lägets meny och R-lägets sidopanel. Lägena
 * skiljer sig ENBART i vilken commit-adapter de skickar in: M-läget skriver
 * via server actions, R-läget via editorns setParsed/autosave. Kontrollerna
 * själva finns i en enda kopia, så en ändring i den ena vyn kan inte längre
 * glida ifrån den andra.
 *
 * Värden har ingen egen rubrik här — den chrome:n ägs av respektive vy.
 */

import { useMemo, useState, type ReactNode } from "react";
import { resolveGradient } from "@/lib/gradient-presets";
import type { SlideGradientValue, SliderEffectValue } from "@/lib/types";
import { BackgroundControls, backgroundKind } from "./BackgroundControls";
import {
  ColorOverridePicker,
  type ColorProp,
  type ColorScope,
} from "./ColorOverridePicker";
import { averageHexColor } from "./DesignPrimitives";
import { EffectPicker } from "./EffectPicker";
import { GradientPicker } from "./GradientPicker";

export interface SlideDesignPanelProps {
  /** Slidens background-prop (bildsökväg, videosökväg eller CSS-värde). */
  background?: string;
  overlay?: string | number;
  overlayMode?: string;
  /** Oskärpa på bakgrundslagret i px (slide-propen backgroundBlur). */
  blur?: string | number;
  gradient: SlideGradientValue | null;
  effect: SliderEffectValue | null;
  slideAccent?: string;
  slideText?: string;
  slideMuted?: string;
  globalAccent?: string;
  globalText?: string;
  globalMuted?: string;
  /** Temats egen bakgrundsfärg (#RRGGBB) — utgångspunkt för kontrastmätning. */
  themeBackground?: string;
  onPickBackgroundImage: () => void;
  onPickBackgroundVideo: () => void;
  onSetBackgroundColor: (cssValue: string) => void;
  onClearBackground: () => void;
  onSetOverlay: (overlay: number, mode: "dark" | "light") => void;
  /** Utelämnad → oskärpe-kontrollen döljs. */
  onSetBlur?: (px: number) => void;
  onGradientChange: (
    value: SlideGradientValue | null,
    continuous?: boolean,
  ) => void;
  onEffectChange: (
    value: SliderEffectValue | null,
    continuous?: boolean,
  ) => void;
  onColorChange: (
    prop: ColorProp,
    value: string | null,
    scope: ColorScope,
  ) => void;
  /** Nollställ hela sliden till temats default. Utelämnad → knappen visas inte. */
  onResetAll?: () => void;
  busy?: boolean;
  /** Extra kontroller under panelen (R-läget lägger storlekar här). */
  children?: ReactNode;
}

export function SlideDesignPanel({
  background,
  overlay,
  overlayMode,
  blur,
  gradient,
  effect,
  slideAccent,
  slideText,
  slideMuted,
  globalAccent,
  globalText,
  globalMuted,
  themeBackground,
  onPickBackgroundImage,
  onPickBackgroundVideo,
  onSetBackgroundColor,
  onClearBackground,
  onSetOverlay,
  onSetBlur,
  onGradientChange,
  onEffectChange,
  onColorChange,
  onResetAll,
  busy = false,
  children,
}: SlideDesignPanelProps) {
  const [scope, setScope] = useState<ColorScope>("slide");

  // Mät kontrasten mot det som FAKTISKT ligger bakom texten. Att jämföra mot
  // temats --bg blir direkt missvisande så fort en gradient ligger under —
  // och det är precis då Joel behöver siffran.
  const { contrastAgainst, contrastApproximate } = useMemo(() => {
    const kind = backgroundKind(background);
    if (kind === "image" || kind === "video") {
      return { contrastAgainst: undefined, contrastApproximate: false };
    }
    if (kind === "color" && background && /^#[0-9a-fA-F]{6}$/.test(background)) {
      return { contrastAgainst: background, contrastApproximate: false };
    }
    const config = resolveGradient(gradient);
    if (config) {
      return {
        contrastAgainst: averageHexColor(config.colors),
        contrastApproximate: true,
      };
    }
    return { contrastAgainst: themeBackground, contrastApproximate: false };
  }, [background, gradient, themeBackground]);

  const hasAnything =
    backgroundKind(background) !== "none" ||
    gradient != null ||
    effect != null ||
    Boolean(slideAccent || slideText || slideMuted);

  return (
    <div className="flex flex-col gap-4">
      <BackgroundControls
        background={background}
        overlay={overlay}
        overlayMode={overlayMode}
        blur={blur}
        hasGradient={gradient != null}
        onPickImage={onPickBackgroundImage}
        onPickVideo={onPickBackgroundVideo}
        onSetColor={onSetBackgroundColor}
        onClear={onClearBackground}
        onSetOverlay={onSetOverlay}
        onSetBlur={onSetBlur}
        busy={busy}
      />

      <GradientPicker value={gradient} onChange={onGradientChange} busy={busy} />

      <EffectPicker value={effect} onChange={onEffectChange} busy={busy} />

      <ColorOverridePicker
        scope={scope}
        onScopeChange={setScope}
        slideAccent={slideAccent}
        slideText={slideText}
        slideMuted={slideMuted}
        globalAccent={globalAccent}
        globalText={globalText}
        globalMuted={globalMuted}
        onApply={onColorChange}
        busy={busy}
        contrastAgainst={contrastAgainst}
        contrastApproximate={contrastApproximate}
      />

      {children}

      {onResetAll ? (
        <button
          type="button"
          onClick={onResetAll}
          disabled={busy || !hasAnything}
          title="Tar bort slidens egna design-värden. Temat och eventuella globala färger står kvar."
          className="self-start rounded-md border border-white/15 bg-white/[0.04] px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] text-white/65 transition-all hover:border-accent hover:bg-accent/[0.08] hover:text-accent disabled:cursor-not-allowed disabled:opacity-30"
        >
          Återställ allt på denna slide
        </button>
      ) : null}
    </div>
  );
}
