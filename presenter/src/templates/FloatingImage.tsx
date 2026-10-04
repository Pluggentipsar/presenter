"use client";

import type { CSSProperties } from "react";
import { motion } from "framer-motion";
import { useInlineEdit, EditableText } from "@/lib/inline-edit";
import { cropImageStyle, parseCrop } from "@/lib/objects";
import { useIsOverlay, useOverlayInstance } from "./SlideWithOverlays";
import { useObjectStep } from "./object-step";

/**
 * FloatingImage — fritt placerad bild ovanpå en slide (eller som egen slide).
 *
 * Bilden ritar bara sig själv. Att flytta, storleksändra, rotera, beskära och
 * ordna gör editorns objektlager (components/editor/ObjectLayer), som hittar
 * bilden via data-object-index och skriver tillbaka props. Så ser bilden
 * likadan ut i spelaren och i editorn, och alla objekt delar ett handtag.
 *
 * MDX-format:
 * ```mdx
 * <FloatingImage
 *   src="/bilder/min-bild.png"
 *   alt="Beskrivning"
 *   x="20%" y="30%" width="28%"
 *   rotation={-3}
 *   crop="0.1 0 0.8 1"     // utsnitt: x y w h som andelar av originalet (kräver height)
 *   radius="1rem"          // hörnradie, "50%" ger cirkel/ellips
 *   flip="x"               // spegla: x, y eller xy
 * />
 * ```
 */

interface FloatingImageProps {
  /** Bildens URL — lokalt path eller extern URL. */
  src: string;
  /** Alt-text för tillgänglighet. */
  alt?: string;
  /** Horisontell position som procent av slide-bredd ("0%"-"100%") eller px. */
  x?: string;
  /** Vertikal position som procent av slide-höjd ("0%"-"100%") eller px. */
  y?: string;
  /** Bredd i px eller procent. Höjd beräknas automatiskt från aspect ratio. */
  width?: string;
  /** Höjd (valfri — om angiven fylls ramen och bilden beskärs med cover). */
  height?: string;
  /** Rotation i grader. Default 0. */
  rotation?: number;
  /** Opacitet 0-1. Default 1. */
  opacity?: number;
  /** Z-index. Default 10. */
  zIndex?: number;
  /**
   * Layer:
   * - "front" (default) — bilden ligger över template-content (zIndex 10)
   * - "back" — bilden ligger UNDER template-content men över bakgrunden (zIndex -1)
   *
   * "back" är användbart för dekorativa bilder du vill ha bakom rubriken/staplar.
   */
  layer?: "front" | "back";
  /** Slide-bakgrund — lägg samma som föregående slide för "overlay"-känsla. */
  background?: string;
  /** Mörk overlay på bakgrunden (0-1). Default 0. */
  overlay?: number;
  /** Liten chapter-tagg uppe till höger. */
  chapter?: string;
  /** Accentfärg. */
  accent?: string;
  /** Stäng av drop-shadow. Bra för transparenta bilder där skuggan annars syns runt kanten. */
  noShadow?: boolean;
  /** Oskärpa i px (CSS blur). Default 0. */
  blur?: number | string;
  /** Ljusstyrka (CSS brightness), 1 = oförändrad. */
  brightness?: number | string;
  /** Utsnitt "x y w h" som andelar (0–1) av originalbilden. Kräver height. */
  crop?: string;
  /** Hörnradie (CSS-längd). "50%" ger cirkel på kvadratisk ram. */
  radius?: string;
  /** Spegla bilden: "x", "y" eller "xy". */
  flip?: string;
  /** Syns efter så många klick (0 eller inget = från början). */
  step?: number | string;
  /** Försvinner vid det här klicket. */
  until?: number | string;
  /** Låst i editorn: går inte att flytta av misstag. */
  locked?: boolean;
  /** Namn i editorns lagerlista. */
  name?: string;
}

function resolveBackground(bg: string | undefined, overlay: number): string {
  if (!bg) return "var(--slide-base, var(--bg))";
  if (bg.startsWith("/") || bg.startsWith("http")) {
    if (overlay > 0) {
      return `linear-gradient(rgba(10,9,8,${overlay}), rgba(10,9,8,${Math.min(1, overlay + 0.06)})), url('${bg}') center/cover no-repeat`;
    }
    return `url('${bg}') center/cover no-repeat`;
  }
  return bg;
}

export function FloatingImage({
  src,
  alt = "",
  x = "20%",
  y = "20%",
  width = "14%",
  height,
  rotation = 0,
  opacity = 1,
  zIndex,
  layer = "front",
  background,
  overlay = 0,
  chapter,
  accent: _accent,
  noShadow = false,
  blur,
  brightness,
  crop,
  radius,
  flip,
  step,
  until,
  locked,
  name: _name,
}: FloatingImageProps) {
  void _accent;
  void _name;
  const blurPx = Number(blur) || 0;
  const bright = brightness === undefined || brightness === "" ? 1 : Number(brightness) || 1;
  const filterCss = [blurPx > 0 ? `blur(${blurPx}px)` : "", bright !== 1 ? `brightness(${bright})` : ""].filter(Boolean).join(" ") || undefined;
  // Layer styr default-zIndex om inget explicit värde angivits.
  // "back" = under mallens text men över markordet (z -1; skalen i
  // withSlideBg är isolerade och innehållet har ingen egen z-index).
  const effectiveZIndex = zIndex ?? (layer === "back" ? -1 : 10);
  const { editMode } = useInlineEdit();
  const isOverlay = useIsOverlay();
  const { index } = useOverlayInstance();
  const shown = useObjectStep(step, until);
  const cropRect = height ? parseCrop(crop) : null;
  const flipCss = flip === "xy" ? "scale(-1, -1)" : flip === "x" ? "scaleX(-1)" : flip === "y" ? "scaleY(-1)" : undefined;
  const borderRadius = radius || (noShadow ? 0 : "0.2rem");

  const wrapperStyle: CSSProperties = {
    position: "absolute",
    left: x,
    top: y,
    width,
    height: height || "auto",
    transform: `rotate(${rotation}deg)`,
    // Klicksteg: dolt i spelaren, dämpat i editorn så att det går att placera.
    opacity: shown ? opacity : editMode ? 0.3 : 0,
    pointerEvents: shown || editMode ? undefined : "none",
    transition: "opacity 320ms ease",
    zIndex: effectiveZIndex,
    cursor: editMode && !locked ? "grab" : "default",
    userSelect: "none",
    touchAction: "none",
  };

  // Utan beskärning: bilden som förut, med skuggan direkt på sig.
  // Med beskärning: en ram med overflow hidden och bilden förstorad/förskjuten
  // inuti (procent av ramen, se cropImageStyle) — skuggan ligger på ramen.
  const shadow = noShadow ? "none" : "0 8px 30px rgba(0,0,0,0.35)";
  const image = cropRect ? (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        borderRadius,
        boxShadow: shadow,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        data-slide-media=""
        src={src}
        alt={alt}
        draggable={false}
        style={{
          position: "absolute",
          display: "block",
          maxWidth: "none",
          ...cropImageStyle(cropRect),
          pointerEvents: "none",
          filter: filterCss,
          transform: flipCss,
        }}
      />
    </div>
  ) : (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      data-slide-media=""
      src={src}
      alt={alt}
      draggable={false}
      style={{
        display: "block",
        width: "100%",
        height: height ? "100%" : "auto",
        objectFit: "cover",
        pointerEvents: "none",
        filter: filterCss,
        transform: flipCss,
        boxShadow: shadow,
        borderRadius,
      }}
    />
  );

  const imageElement = (
    <div
      data-object-index={editMode && isOverlay && index !== undefined ? index : undefined}
      data-object-kind={editMode ? "image" : undefined}
      data-object-locked={editMode && locked ? "" : undefined}
      data-object-hidden={editMode && !shown ? "" : undefined}
      style={wrapperStyle}
    >
      {image}
    </div>
  );

  // OVERLAY-MODE: bara bilden, ingen slide-container.
  // Föräldern (SlideWithOverlays) har redan position:relative.
  if (isOverlay) return imageElement;

  // STANDALONE-MODE: full slide-canvas med bakgrund + chapter-tagg.
  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: resolveBackground(background, overlay) }}
    >
      {/* Chapter — uppe till höger */}
      {chapter ? (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          style={{
            position: "absolute",
            top: "clamp(2rem, 4vh, 3.5rem)",
            right: "clamp(2rem, 4vw, 3.5rem)",
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(0.7rem, 0.9vw, 0.95rem)",
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            color: "var(--text-muted)",
            zIndex: 5,
          }}
        >
          <EditableText path="chapter" value={chapter}>
            {chapter}
          </EditableText>
        </motion.div>
      ) : null}

      {imageElement}
    </div>
  );
}
