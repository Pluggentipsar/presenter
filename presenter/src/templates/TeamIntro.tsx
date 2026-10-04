"use client";

import { motion } from "framer-motion";
import { Children, isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";
import { EditableText } from "@/lib/inline-edit";

type Size = "sm" | "md" | "lg" | "xl";

interface TeamIntroProps {
  /** Bakgrundsmedia — video (mp4) eller bild. Required. */
  background: string;
  /** Typ av bakgrundsmedia */
  backgroundType?: "video" | "image";
  /** Stor centrerad titel högst upp */
  title: string;
  /** Liten UPPERCASE-tag över titeln */
  eyebrow?: string;
  /** Undertitel under titeln */
  subtitle?: string;
  /**
   * Gradient-stil för läsbarhet ovanpå bakgrunden:
   * - "both" (default): mörk upptill OCH nertill, lätt mitt
   * - "top" | "bottom": bara i ena änden
   * - "center": vignette-stil, mitten mörkare
   * - "none": ingen gradient
   */
  gradient?: "both" | "top" | "bottom" | "center" | "none";
  /** Global overlay-opacity (0-1), applied i tillägg till gradient. Default 0.35 */
  overlay?: number | string;
  /** Antal kolumner för medlemskort (auto baserat på antal) */
  columns?: number | string;
  /** Rubrik-storlek. Default lg. */
  titleSize?: Size;
  /** TeamMember-element */
  children?: ReactNode;
}

interface TeamMemberProps {
  /** Namn (stor) */
  name: string;
  /** Roll/yrke (under namn) */
  role?: string;
  /**
   * Meriter/bio i markdown-lista eller brödtext.
   * - **fet** text blir accent-färgad.
   */
  children?: ReactNode;
}

const TITLE_SIZES: Record<Size, string> = {
  sm: "clamp(2rem, 4vw, 3.5rem)",
  md: "clamp(2.5rem, 5vw, 4.5rem)",
  lg: "clamp(3.25rem, 6.5vw, 5.75rem)",
  xl: "clamp(4rem, 8vw, 7rem)",
};

function extractMembers(
  children: ReactNode
): { name: string; role?: string; body: ReactNode }[] {
  const out: { name: string; role?: string; body: ReactNode }[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const el = child as ReactElement<TeamMemberProps>;
    if (typeof el.type === "string") return;
    const name = el.props?.name;
    if (typeof name !== "string") return;
    out.push({
      name,
      role: el.props.role,
      body: el.props.children,
    });
  });
  return out;
}

/**
 * TeamIntro — presentera ett team / grundarpar / författare mot en
 * stämningsfull bakgrund (video eller bild). Gradient för läsbarhet,
 * glassmorphism-cards för medlemmar. Generisk — funkar för founders,
 * styrelser, workshops-team etc.
 *
 * <TeamIntro
 *   background="/videos/hero.mp4"
 *   title="Rangsjö Creation AB"
 *   gradient="both"
 * >
 *   <TeamMember name="Joel Rangsjö" role="Verksamhetsutvecklare AI">
 *   Författare till *Med AI som stöd* (Liber). Nominerad till årets AI-svensk.
 *   </TeamMember>
 *   <TeamMember name="Förnamn Efternamn" role="Utvecklingsstrateg & författare">
 *   Författare till *Skolans roll mot heder*. Hederssamordnare.
 *   </TeamMember>
 * </TeamIntro>
 */
export function TeamIntro({
  background,
  backgroundType = "video",
  title,
  eyebrow,
  subtitle,
  gradient = "both",
  overlay = 0.35,
  columns,
  titleSize = "lg",
  children,
}: TeamIntroProps) {
  const members = extractMembers(children);
  const overlayNum =
    typeof overlay === "string" ? parseFloat(overlay) : overlay;
  const colCount =
    typeof columns === "string"
      ? parseInt(columns, 10)
      : columns ?? Math.min(Math.max(members.length, 1), 3);

  const gradientCss: Record<NonNullable<TeamIntroProps["gradient"]>, string> = {
    none: "transparent",
    top: "linear-gradient(180deg, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.35) 45%, transparent 100%)",
    bottom:
      "linear-gradient(0deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.35) 55%, transparent 100%)",
    both: "linear-gradient(180deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.25) 30%, rgba(0,0,0,0.3) 60%, rgba(0,0,0,0.8) 100%)",
    center:
      "radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.6) 80%)",
  };

  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* Bakgrund: video eller bild */}
      {backgroundType === "video" ? (
        <video
          src={background}
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={background}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}

      {/* Overlay (fast darkening) */}
      <div
        className="absolute inset-0"
        style={{
          background: "#000",
          opacity: overlayNum,
        }}
      />

      {/* Gradient-överlagring för läsbarhet */}
      {gradient !== "none" && (
        <div
          className="absolute inset-0"
          style={{ background: gradientCss[gradient] }}
        />
      )}

      {/* Accentfärgad "glow" i övre delen (brand-touch) */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[40%]"
        style={{
          background:
            "radial-gradient(ellipse at 50% 0%, color-mix(in srgb, var(--accent) 18%, transparent) 0%, transparent 70%)",
        }}
      />

      {/* Innehåll — kompakt topptitel, stora kort dominerar */}
      <div
        className="relative z-10 grid h-full w-full px-10 py-10"
        style={{
          gridTemplateRows: "auto 1fr",
          rowGap: "clamp(2rem, 4vh, 4rem)",
        }}
      >
        {/* Titel högst upp (kompakt) */}
        <div className="flex w-full flex-col items-center text-center">
          {eyebrow && (
            <motion.span
              className="mb-3 uppercase"
              style={{
                color: "var(--accent)",
                fontSize: "clamp(0.75rem, 1.1vw, 1rem)",
                letterSpacing: "0.5em",
                fontWeight: 600,
              }}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <EditableText path="eyebrow" value={eyebrow ?? ""}>{eyebrow}</EditableText>
            </motion.span>
          )}
          <motion.h1
            className="leading-[0.95]"
            style={{
              fontSize: TITLE_SIZES[titleSize],
              fontFamily: "var(--font-display)",
              fontWeight: "var(--heading-weight)",
              letterSpacing: "0.02em",
              textTransform: "uppercase",
              color: "#ffffff",
              textShadow: "0 2px 30px rgba(0,0,0,0.6)",
            }}
            initial={{ opacity: 0, y: 14, letterSpacing: "0.1em" }}
            animate={{ opacity: 1, y: 0, letterSpacing: "0.02em" }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
          >
            <EditableText
              path="title"
              value={title ?? ""}
              sizeControls={[
                { prop: "titleSize", current: titleSize, options: ["sm", "md", "lg", "xl"], label: "Titel" },
              ]}
            >{title}</EditableText>
          </motion.h1>
          {subtitle && (
            <motion.p
              className="mt-4 max-w-3xl leading-snug"
              style={{
                fontSize: "clamp(1.1rem, 1.7vw, 1.5rem)",
                color: "rgba(255,255,255,0.85)",
                fontFamily: "var(--font-display)",
                fontStyle: "italic",
              }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
            >
              <EditableText path="subtitle" value={subtitle ?? ""}>{subtitle}</EditableText>
            </motion.p>
          )}
        </div>

        {/* Medlemskort — dominerar resten av sliden */}
        {members.length > 0 && (
          <div
            className="grid w-full gap-6"
            style={{
              maxWidth: "min(1400px, 96vw)",
              margin: "0 auto",
              gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))`,
              alignItems: "stretch",
            }}
          >
            {members.map((m, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 40, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{
                  duration: 0.75,
                  delay: 0.85 + i * 0.2,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="flex flex-col"
                style={{
                  padding: "clamp(2rem, 3.5vw, 3.5rem)",
                  gap: "clamp(1rem, 1.6vh, 1.5rem)",
                  borderRadius: "var(--radius)",
                  border: "1px solid rgba(255,255,255,0.22)",
                  background: "rgba(255,255,255,0.08)",
                  backdropFilter: "blur(16px) saturate(1.25)",
                  WebkitBackdropFilter: "blur(16px) saturate(1.25)",
                  boxShadow:
                    "0 50px 100px -30px rgba(0,0,0,0.7), 0 1px 0 rgba(255,255,255,0.12) inset",
                }}
              >
                <div
                  className="leading-[1.05]"
                  style={{
                    fontSize: "clamp(2.25rem, 3.6vw, 3.5rem)",
                    fontFamily: "var(--font-display)",
                    fontWeight: "var(--heading-weight)",
                    letterSpacing: "var(--heading-tracking)",
                    color: "#ffffff",
                  }}
                >
                  {m.name}
                </div>
                {m.role && (
                  <div
                    className="uppercase"
                    style={{
                      color: "var(--accent)",
                      fontWeight: 600,
                      fontSize: "clamp(0.85rem, 1.15vw, 1.05rem)",
                      letterSpacing: "0.25em",
                      lineHeight: 1.3,
                    }}
                  >
                    {m.role}
                  </div>
                )}
                {m.body && (
                  <div
                    className="team-member-body leading-snug"
                    style={{
                      fontSize: "clamp(1.15rem, 1.55vw, 1.5rem)",
                      color: "rgba(255,255,255,0.9)",
                      lineHeight: 1.45,
                    }}
                  >
                    {m.body}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        .team-member-body strong {
          color: var(--accent);
          font-weight: 600;
        }
        .team-member-body em {
          color: #ffffff;
          font-style: italic;
        }
        .team-member-body p {
          margin: 0;
        }
        .team-member-body p + p {
          margin-top: 0.5rem;
        }
      `}</style>
    </div>
  );
}

/**
 * TeamMember — sub-component för TeamIntro. Renderas inte ensam.
 */
export function TeamMember(_props: TeamMemberProps) {
  return null;
}
TeamMember.displayName = "TeamMember";
