"use client";

/**
 * Glass-decoration-module för nattglas-temat (och framtida liquid-glass-teman).
 *
 * Exporterar:
 * - `glassCardStyle()` — utility som returnerar CSS för en glass-panel med
 *   multi-layer backdrop-filter, specular highlight på topp, subtle ljus
 *   uppifrån, accent-tint i botten.
 * - `<GlassCard>` — färdig komponent.
 * - `<AmbientBackdrop>` — slide-bakgrund med vibrant gradient + film grain
 *   + ambient orbs som ger glass-paneler något att refraktera mot.
 * - `<SpecularHighlight>` — pseudo-overlay som simulerar lensing/light-bending
 *   (Apple Liquid Glass-effekt).
 *
 * Använder enbart CSS-variabler — fungerar bara fullt med nattglas-tema,
 * men degraderar snyggt på andra teman.
 */

import type { CSSProperties, ReactNode } from "react";

export interface GlassCardStyleOptions {
  /** Border-radius. Default "1.125rem" (Apple-aktig). */
  radius?: string;
  /** Blur-styrka. Default 24. */
  blur?: number;
  /** Subtle saturation boost. Default 180 (procent). */
  saturate?: number;
  /** Subtle brightness boost. Default 110 (procent). */
  brightness?: number;
  /** Om true: dramatic shadow under cardet. Default true. */
  withShadow?: boolean;
  /** Padding inuti cardet. Default "clamp(1.5rem, 2.5vw, 2.25rem)". */
  padding?: string;
}

export function glassCardStyle(opts: GlassCardStyleOptions = {}): CSSProperties {
  const {
    radius = "1.125rem",
    blur = 24,
    saturate = 180,
    brightness = 110,
    withShadow = true,
    padding = "clamp(1.5rem, 2.5vw, 2.25rem)",
  } = opts;

  // Glas-utseendet är var-drivet med MÖRKA defaults (nattglas m.fl. oförändrade).
  // Ljus-teman (t.ex. dagsljus) sätter --glass-card-* i sitt scopade
  // globals.css-block: ljus veil, cool-tonad mjuk skugga, brightness < 100%.
  return {
    position: "relative",
    background:
      "var(--glass-card-bg, linear-gradient(135deg, rgba(255,255,255,0.06) 0%, var(--glass-tint, rgba(255,255,255,0.02)) 55%, rgba(255,255,255,0.02) 100%))",
    backdropFilter: `blur(${blur}px) saturate(${saturate}%) brightness(var(--glass-card-brightness, ${brightness}%))`,
    WebkitBackdropFilter: `blur(${blur}px) saturate(${saturate}%) brightness(var(--glass-card-brightness, ${brightness}%))`,
    border: "var(--glass-border-width, 1px) solid var(--glass-border, rgba(255,255,255,0.08))",
    borderTopColor: "var(--glass-border-top, rgba(255,255,255,0.18))",
    // Radien är var-driven så brutalistiska teman (kobolt) kan nolla den.
    borderRadius: `var(--glass-radius, ${radius})`,
    padding,
    boxShadow: withShadow
      ? "var(--glass-card-shadow, 0 12px 40px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.1), inset 0 -1px 0 rgba(0,0,0,0.2))"
      : "var(--glass-card-shadow-flat, inset 0 1px 0 rgba(255,255,255,0.1))",
    overflow: "hidden",
  };
}

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** Lägg en specular highlight i topp/sida. Default true. */
  specular?: boolean;
  /** Card-storlek-presets. */
  size?: "sm" | "md" | "lg";
  options?: GlassCardStyleOptions;
}

const SIZE_PRESETS: Record<NonNullable<GlassCardProps["size"]>, GlassCardStyleOptions> = {
  sm: { padding: "clamp(1rem, 1.5vw, 1.4rem)", radius: "0.875rem", blur: 18 },
  md: {},
  lg: { padding: "clamp(2rem, 3.5vw, 3rem)", radius: "1.375rem", blur: 30 },
};

export function GlassCard({
  children,
  className,
  style,
  specular = true,
  size = "md",
  options,
}: GlassCardProps) {
  const baseStyle = glassCardStyle({ ...SIZE_PRESETS[size], ...options });
  return (
    <div className={className} style={{ ...baseStyle, ...style }}>
      {specular ? <SpecularHighlight /> : null}
      <div style={{ position: "relative", zIndex: 1 }}>{children}</div>
    </div>
  );
}

interface SpecularHighlightProps {
  /** Intensitet 0-1. Default 0.18. */
  intensity?: number;
}

/**
 * Specular highlight på glass-card — simulerar Apple's Liquid Glass-lensing.
 * En diagonal lysande linje från topp-vänster + en mjuk accent-glow i
 * botten-höger som tillsammans skapar känslan av att glaset reagerar på
 * en ljuskälla.
 */
export function SpecularHighlight({ intensity = 0.18 }: SpecularHighlightProps) {
  return (
    <div className="ambient-accent"
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        borderRadius: "inherit",
        background: `
          linear-gradient(120deg,
            rgba(255,255,255,${intensity}) 0%,
            rgba(255,255,255,0) 28%,
            rgba(255,255,255,0) 72%,
            var(--accent-dim, rgba(255,255,255,0.04)) 100%
          ),
          radial-gradient(ellipse at 8% 0%,
            rgba(255,255,255,${intensity * 0.8}) 0%,
            rgba(255,255,255,0) 35%
          )
        `,
        pointerEvents: "none",
        mixBlendMode: "screen",
      }}
    />
  );
}

interface AmbientBackdropProps {
  /** Bild eller video som refrakteras under glass-paneler. */
  background?: string;
  /** Mörk overlay 0-1. Default 0.55 (apple-känsla). */
  overlay?: number;
  /** Visa orbs (ambient blur-bollar i accent-färger). Default true. */
  orbs?: boolean;
  /** Visa film grain. Default true. */
  grain?: boolean;
  /** Custom accent för orbs. Default tema-accent. */
  accent?: string;
  /** Sekundär accent (för 2-orbs-variation). */
  accent2?: string;
}

/**
 * AmbientBackdrop — slide-bakgrund i nattglas-stil.
 *
 * Lager (botten → topp):
 *   1. Bg-färg (tema)
 *   2. Bild/video (om angiven) med mörk overlay
 *   3. Vibrant orbs (radial-gradients med blur) i accent-färger
 *   4. Film grain (SVG noise)
 *
 * Glass-paneler placerade ovanpå denna får något att refraktera mot.
 */
export function AmbientBackdrop({
  background,
  overlay = 0.55,
  orbs = true,
  grain = true,
  accent = "var(--accent)",
  accent2,
}: AmbientBackdropProps) {
  // Overlay-färgen är var-driven: mörka teman tonar bilden mot svart (default),
  // ljus-teman (--ambient-overlay = ljus botten-rgb) tonar mot cream/vitt.
  const bgLayer = background
    ? background.startsWith("/") || background.startsWith("http")
      ? `linear-gradient(rgba(var(--ambient-overlay, 6,7,12),${overlay}), rgba(var(--ambient-overlay, 6,7,12),${Math.min(1, overlay + 0.15)})), url('${background}') center/cover no-repeat`
      : background
    : "var(--bg, #06070c)";

  const orbAccent2 = accent2 ?? "var(--accent)";

  return (
    <>
      {/* Basen bär klassen ambient-base: inuti ett mark-skal (withSlideBg,
          data-mark-shell) töms den så markordet syns genom mallen. */}
      <div
        aria-hidden
        className="ambient-base"
        style={{
          position: "absolute",
          inset: 0,
          background: bgLayer,
          zIndex: 0,
        }}
      />
      {orbs ? (
        <>
          {/* Orbarna bär klassen ambient-accent så tysta teman (kobolt:
              rent papper) kan släcka dem — bildlagret ovan berörs inte. */}
          <div
            aria-hidden
            className="ambient-accent"
            style={{
              position: "absolute",
              top: "-15%",
              left: "-10%",
              width: "55%",
              height: "55%",
              borderRadius: "50%",
              background: accent,
              filter: "blur(140px)",
              opacity: 0.22,
              pointerEvents: "none",
              zIndex: 0,
            }}
          />
          <div
            aria-hidden
            className="ambient-accent"
            style={{
              position: "absolute",
              bottom: "-20%",
              right: "-12%",
              width: "60%",
              height: "60%",
              borderRadius: "50%",
              background: orbAccent2,
              filter: "blur(160px)",
              opacity: 0.18,
              pointerEvents: "none",
              zIndex: 0,
            }}
          />
        </>
      ) : null}
      {grain ? <FilmGrain /> : null}
    </>
  );
}

/**
 * Film grain — subtle noise overlay som ger digital bakgrund en mer
 * fysisk känsla. 3% opacity. Använder en inline SVG turbulence-filter.
 */
export function FilmGrain({ opacity = 0.05 }: { opacity?: number }) {
  return (
    <div
      aria-hidden
      className="ambient-accent"
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        opacity,
        mixBlendMode: "overlay",
        zIndex: 1,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 1 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        backgroundSize: "180px",
      }}
    />
  );
}
