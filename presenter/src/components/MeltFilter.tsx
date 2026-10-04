"use client";

/**
 * MeltFilter — SVG-filtret bakom smältordet (betong, 2026-09-04).
 *
 * Ett ord går genom feTurbulence + feDisplacementMap så att det sjunker och
 * rinner; SMIL-animationen på `scale` får det att röra sig långsamt utan att
 * någon JS behövs. Tesen som form: AI tar bort MOTSTÅND.
 *
 * Används av SlideMark (markStyle="melt") och PosterHero (wordStyle="melt").
 * Flera instanser med samma id på en sida är ofarligt — filtret är identiskt.
 */
export const MELT_FILTER_ID = "slide-melt";

export function MeltFilter({ id = MELT_FILTER_ID, seed = 11 }: { id?: string; seed?: number }) {
  return (
    <svg width="0" height="0" style={{ position: "absolute", width: 0, height: 0 }} aria-hidden focusable="false">
      <filter id={id} x="-10%" y="-25%" width="120%" height="170%" colorInterpolationFilters="sRGB">
        <feTurbulence type="turbulence" baseFrequency="0.004 0.011" numOctaves="1" seed={seed} result="t" />
        <feDisplacementMap in="SourceGraphic" in2="t" xChannelSelector="R" yChannelSelector="G" scale="30">
          <animate attributeName="scale" values="26;46;26" dur="11s" repeatCount="indefinite" />
        </feDisplacementMap>
      </filter>
    </svg>
  );
}
