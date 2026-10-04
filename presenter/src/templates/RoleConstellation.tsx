"use client";

import { motion } from "framer-motion";
import { Children, isValidElement, useMemo } from "react";
import type { ReactElement, ReactNode } from "react";
import { EditableText } from "@/lib/inline-edit";
import { useSlideSteps } from "@/lib/slide-steps";
import { withAlpha } from "@/lib/gradient-presets";
import { ParticleText } from "./_decorations/ParticleText";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * RoleConstellation — visualiserar AI som mångdimensionell deltagare.
 *
 * Steg 1: Stort "VERKTYG" centrerat — den platta synen vi vill lämna.
 * Steg 2: VERKTYG fader bort, "AI" tar dess plats i mitten.
 * Steg 3: Roll-etiketter exploderar fram i orbital cirkel runt AI och
 *         roterar långsamt som planeter runt en sol, med landningsmening.
 * Steg 4: Med `finale` satt löses allt upp och partiklarna som blir kvar
 *         formar nästa fråga. Konstellationen blir alltså frågan — det är
 *         därför upplösningen och materialiseringen hör ihop i ETT steg
 *         i stället för att delas på två slides.
 *
 * Pedagogisk poäng: när AI bara ses som "verktyg" tappar vi alla de
 * andra dimensioner det kan vara — samtalspartner, kritiker, muse,
 * elev, expert, novis. Animationen gör transformationen visuell.
 *
 * MDX-format — varje listpunkt är en roll AI kan vara:
 *
 * ```mdx
 * <RoleConstellation chapter="§ Bortom verktyget" landing="...">
 * - samtalspartner
 * - djävulens advokat
 * - elev
 * - expert
 * - kritiker
 * - muse
 * - kollega
 * - bollplank
 * </RoleConstellation>
 * ```
 */

interface RoleConstellationProps {
  chapter?: string;
  /** Centrum-ord vi vill lämna. Default "VERKTYG". */
  oldNoun?: string;
  /** Centrum-ord vi vill till. Default "AI". */
  newNoun?: string;
  /** Stor avslutande mening under konstellationen. */
  landing?: string;
  /**
   * Frågan konstellationen lämnar över till. Sätts den får sliden ett fjärde
   * steg: allt löses upp och materialiseras som partiklar till den här texten.
   * Radbryt med \n.
   */
  finale?: string;
  background?: string;
  overlay?: number | string;
  /**
   * Scrimens karaktär över ett foto. "dark" (default) är byggt för ljus text
   * mot mörk botten. "light" behövs när bilden är ljus och temat är ljust —
   * då mörknar ingenting och texten följer temat i stället för att tvingas vit.
   */
  overlayMode?: "dark" | "light";
  accent?: string;
  children?: ReactNode;
}

// ============================================================================
// Parsing
// ============================================================================

function extractText(rawNode: ReactNode): string {
  const node = unwrapLazy(rawNode);
  if (node == null || node === false) return "";
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (isValidElement(node)) {
    const el = node as ReactElement<{ children?: ReactNode }>;
    const t = el.type;
    const inner = extractText(el.props.children);
    if (t === "strong") return `**${inner}**`;
    if (t === "em") return `*${inner}*`;
    if (t === "br") return "\n";
    return inner;
  }
  return "";
}

function parseRoles(children: ReactNode): string[] {
  const roles: string[] = [];
  const walkLi = (li: ReactElement<{ children?: ReactNode }>) => {
    const raw = extractText(li.props.children).trim();
    if (raw) roles.push(raw);
  };
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const el = child as ReactElement<{ children?: ReactNode }>;
    const t = el.type;
    if (t === "ul" || t === "ol") {
      Children.forEach(el.props.children, (li) => {
        if (isValidElement(li) && (li as ReactElement).type === "li") {
          walkLi(li as ReactElement<{ children?: ReactNode }>);
        }
      });
    } else if (t === "li") {
      walkLi(el);
    }
  });
  return roles;
}

function isPhotoBg(bg: string | undefined): boolean {
  return Boolean(bg && (bg.startsWith("/") || bg.startsWith("http")));
}

/**
 * Basytan bakom allt.
 *
 * Foton och videor målas INTE här. withSlideBg i PresentationRenderer wrappar
 * varje mall och renderar en `background`-prop som ett eget skal — med scrim,
 * overlayMode och riktigt <video>-lager — och tvingar samtidigt mallens egen
 * rot-bakgrund transparent. Målar mallen också får man två lager av samma bild.
 *
 * var(--slide-base, …) gör att en per-slide-gradient från frontmatter syns
 * igenom. Utan den målade mallen över gradienten med temats egen färg.
 */
function resolveBaseBackground(bg: string | undefined): string {
  const fallback = "var(--slide-base, var(--bg))";
  if (!bg || isPhotoBg(bg)) return fallback;
  return bg;
}

// When a photo with a dark scrim is the backdrop, text and ornament must stay
// fixed-light for legibility regardless of theme. Otherwise follow theme tokens.
const FIXED_LIGHT = "rgba(245,246,250,0.92)";
const FIXED_LIGHT_MUTED = "rgba(245,246,250,0.6)";

// ============================================================================
// Huvud-template
// ============================================================================

export function RoleConstellation({
  chapter,
  oldNoun = "VERKTYG",
  newNoun = "AI",
  landing,
  finale,
  background,
  // `overlay` läses inte här — withSlideBg-skalet konsumerar den när det
  // målar bakgrunden. Den står kvar i propsen för att vara dokumenterad.
  overlayMode = "dark",
  accent = "var(--accent)",
  children,
}: RoleConstellationProps) {
  const roles = useMemo(() => parseRoles(children), [children]);

  // Bara en MÖRK scrim tvingar texten ljus. En ljus scrim över ett ljust foto
  // ska tvärtom låta temat bestämma — annars blir vit text på vit bild.
  const photoSrc = isPhotoBg(background) ? background : undefined;
  const darkScrim = Boolean(photoSrc) && overlayMode === "dark";
  const textColor = darkScrim ? FIXED_LIGHT : "var(--text)";
  const mutedColor = darkScrim ? FIXED_LIGHT_MUTED : "var(--text-muted)";
  // Textskuggor är bara meningsfulla mot mörk scrim; släck dem på ljust tema.
  const heroShadow = darkScrim
    ? `0 0 80px ${withAlpha(accent, 0.4)}, 0 8px 50px rgba(0,0,0,0.6)`
    : `0 0 60px ${withAlpha(accent, 0.25)}`;
  const oldNounShadow = darkScrim ? "0 8px 50px rgba(0,0,0,0.7)" : "none";
  const landingShadow = darkScrim ? "0 4px 20px rgba(0,0,0,0.6)" : "none";
  // Inaktiv progress-track: ljus prick mot scrim, mörk hårfin annars.
  const trackColor = darkScrim ? "rgba(245,246,250,0.25)" : "rgba(0,0,0,0.14)";

  // Stegsystem:
  //  step 0: bara oldNoun (VERKTYG) syns
  //  step 1: transformation — newNoun (AI) tar plats i mitten
  //  step 2: alla roller exploderar fram + landing
  //  step 3: allt löses upp och blir partiklar som formar finale (om satt)
  const totalSteps = finale ? 4 : 3;
  const activeStep = useSlideSteps(totalSteps);
  const isFinale = Boolean(finale) && activeStep >= 3;

  // I finalen töms duken helt — det är upplösningen som gör materialiseringen
  // läsbar. Ligger de gamla orden kvar blir det bara rörigt.
  const showOldNoun = activeStep === 0;
  const showNewNoun = activeStep >= 1 && !isFinale;
  const showRoles = activeStep >= 2 && !isFinale;
  const showLanding = activeStep >= 2 && !isFinale;

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: resolveBaseBackground(background) }}
    >
      {/* Chapter */}
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
            color: mutedColor,
            zIndex: 5,
          }}
        >
          <EditableText path="chapter" value={chapter}>
            {chapter}
          </EditableText>
        </motion.div>
      ) : null}

      {/* Hårkorsmarkör */}
      <motion.div
        aria-hidden
        initial={{ opacity: 0, scaleX: 0 }}
        animate={{ opacity: 1, scaleX: 1 }}
        transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        style={{
          position: "absolute",
          top: "clamp(3rem, 5vh, 4rem)",
          left: "clamp(3rem, 6vw, 6rem)",
          width: "3rem",
          height: "1px",
          background: accent,
          transformOrigin: "left",
          zIndex: 5,
        }}
      />

      {/* Roterande orbital — innehåller roll-etiketter när visible */}
      <motion.div
        animate={showRoles ? { rotate: 360 } : { rotate: 0 }}
        transition={{
          duration: 60,
          repeat: showRoles ? Infinity : 0,
          ease: "linear",
        }}
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: 0,
          height: 0,
          zIndex: 2,
        }}
      >
        {showRoles
          ? roles.map((role, i) => (
              <RoleLabel
                key={i}
                role={role}
                index={i}
                total={roles.length}
                accent={accent}
                onPhoto={darkScrim}
              />
            ))
          : null}
      </motion.div>

      {/* Centrumord (gamla → nya) */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 3,
          pointerEvents: "none",
        }}
      >
        {/* OLD: VERKTYG */}
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{
            opacity: showOldNoun ? 1 : 0,
            scale: showOldNoun ? 1 : 0.6,
          }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          style={{
            position: "absolute",
            fontFamily: "var(--font-display)",
            fontWeight: 800,
            fontSize: "clamp(5rem, 12vw, 14rem)",
            color: textColor,
            letterSpacing: "-0.04em",
            lineHeight: 0.9,
            textShadow: oldNounShadow,
          }}
        >
          {oldNoun}
        </motion.div>

        {/* NEW: AI */}
        <motion.div
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{
            opacity: showNewNoun ? 1 : 0,
            scale: showNewNoun ? 1 : 0.7,
          }}
          transition={{ duration: 1, delay: showOldNoun ? 0 : 0.3, ease: [0.22, 1, 0.36, 1] }}
          style={{
            position: "absolute",
            fontFamily: "var(--font-display)",
            fontWeight: 900,
            fontSize: "clamp(6rem, 15vw, 18rem)",
            color: accent,
            letterSpacing: "-0.05em",
            lineHeight: 0.9,
            textShadow: heroShadow,
          }}
        >
          {newNoun}
        </motion.div>

        {/* Pulserande halo runt AI */}
        {showNewNoun ? (
          <motion.div
            aria-hidden
            animate={{
              scale: [1, 1.15, 1],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            style={{
              position: "absolute",
              width: "clamp(20rem, 40vw, 36rem)",
              height: "clamp(20rem, 40vw, 36rem)",
              borderRadius: "50%",
              background: `radial-gradient(circle, ${withAlpha(accent, 0.13)} 0%, transparent 70%)`,
              pointerEvents: "none",
            }}
          />
        ) : null}
      </div>

      {/* Finalen — orden materialiseras ur partiklarna som de upplösta orden
          lämnade efter sig. spawnRadius matchar rollernas orbital, så det
          läser som att konstellationen blir frågan. */}
      {finale ? (
        <div style={{ position: "absolute", inset: 0, zIndex: 4 }}>
          <ParticleText
            text={finale}
            active={isFinale}
            color={accent}
            spawnRadius={440}
          />
        </div>
      ) : null}

      {/* Landing-mening + progress i botten */}
      <div
        style={{
          position: "absolute",
          bottom: "clamp(3rem, 6vh, 5rem)",
          left: 0,
          right: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "clamp(0.8rem, 1.6vh, 1.4rem)",
          padding: "0 clamp(3rem, 6vw, 7rem)",
          zIndex: 4,
        }}
      >
        {landing && showLanding ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
            style={{
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: "clamp(1.1rem, 1.8vw, 1.8rem)",
              color: textColor,
              textAlign: "center",
              maxWidth: "44em",
              lineHeight: 1.3,
              textShadow: landingShadow,
            }}
          >
            <EditableText path="landing" value={landing}>
              {landing}
            </EditableText>
          </motion.div>
        ) : null}

        {/* Progress-indikator */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(0.65rem, 0.75vw, 0.78rem)",
            letterSpacing: "0.25em",
            textTransform: "uppercase",
            color: mutedColor,
          }}
        >
          <div style={{ display: "flex", gap: "0.4rem" }}>
            {Array.from({ length: totalSteps }, (_, i) => (
              <span
                key={i}
                style={{
                  height: "2px",
                  width: i === activeStep ? "1.6rem" : "0.4rem",
                  background: i <= activeStep ? accent : trackColor,
                  transition: "all 300ms ease",
                  borderRadius: "1px",
                }}
              />
            ))}
          </div>
          <span style={{ marginLeft: "0.6rem" }}>
            {activeStep + 1} / {totalSteps}
          </span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Roll-etikett — orbital position runt center
// ============================================================================

function RoleLabel({
  role,
  index,
  total,
  accent,
  onPhoto,
}: {
  role: string;
  index: number;
  total: number;
  accent: string;
  onPhoto: boolean;
}) {
  // Position runt cirkeln
  const angle = (index / total) * 360 - 90;
  const angleRad = (angle * Math.PI) / 180;
  // Radie: lite varierande för att inte se för mekanisk ut.
  const baseRadius = 440;
  const radiusJitter = ((index * 73) % 80) - 40;
  const radius = baseRadius + radiusJitter;
  const x = Math.cos(angleRad) * radius;
  const y = Math.sin(angleRad) * radius;

  // Tre stilvarianter — som en redaktionell sida med olika setningar.
  // Var tredje får accent-färg, var fjärde får serif italic, övriga är
  // sans-serif normal weight. Skapar ett textbild som ser handsatt ut.
  const styleVariant = index % 3;
  const isAccent = index % 4 === 1;
  const isSerifItalic = styleVariant === 2;

  // Storlek varierar — ger en magazine-feel
  const sizeRem = 1.05 + ((index * 17) % 6) * 0.18; // 1.05 - 1.95
  const delay = 0.1 + (index % 5) * 0.12;

  // Tilt: små rotationsavvikelser
  const tilt = ((index * 11) % 7) - 3; // -3 till +3 grader

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5, rotate: 0 }}
      animate={{ opacity: 1, scale: 1, rotate: tilt }}
      transition={{
        duration: 0.75,
        delay,
        ease: [0.22, 1, 0.36, 1],
      }}
      style={{
        position: "absolute",
        left: `${x}px`,
        top: `${y}px`,
        transform: "translate(-50%, -50%)",
        whiteSpace: "nowrap",
        pointerEvents: "none",
        display: "flex",
        alignItems: "center",
        gap: "0.4rem",
      }}
    >
      {/* Liten accent-prick framför roll-etiketten — som ett bullet-tecken */}
      <motion.div
        animate={{
          opacity: [0.4, 0.95, 0.4],
          scale: [0.85, 1.15, 0.85],
        }}
        transition={{
          duration: 2.6 + (index % 3) * 0.4,
          delay: index * 0.18,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        style={{
          width: "0.42rem",
          height: "0.42rem",
          borderRadius: "50%",
          background: isAccent ? accent : onPhoto ? FIXED_LIGHT_MUTED : "var(--text-muted)",
          boxShadow: isAccent
            ? `0 0 12px ${accent}, 0 0 4px ${accent}`
            : onPhoto
              ? "0 0 6px rgba(247,241,230,0.4)"
              : "none",
          flexShrink: 0,
        }}
      />
      {/* Rollens text */}
      <motion.div
        animate={{
          opacity: [0.78, 1, 0.78],
        }}
        transition={{
          duration: 3.2 + (index % 3) * 0.5,
          delay: index * 0.22,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        style={{
          fontFamily: "var(--font-display)",
          fontStyle: isSerifItalic ? "italic" : "normal",
          fontWeight: isSerifItalic ? 400 : isAccent ? 700 : 500,
          fontSize: `clamp(0.95rem, ${sizeRem}vw, ${sizeRem * 1.45}rem)`,
          color: isAccent ? accent : onPhoto ? FIXED_LIGHT : "var(--text)",
          letterSpacing: isAccent ? "-0.01em" : "0",
          textShadow: onPhoto
            ? isAccent
              ? `0 2px 16px rgba(0,0,0,0.85), 0 0 24px ${withAlpha(accent, 0.33)}`
              : `0 2px 14px rgba(0,0,0,0.75), 0 0 18px rgba(0,0,0,0.4)`
            : isAccent
              ? `0 0 24px ${withAlpha(accent, 0.33)}`
              : "none",
          textTransform: "none",
        }}
      >
        {role}
      </motion.div>
    </motion.div>
  );
}
