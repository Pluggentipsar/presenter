"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Children, isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { EditableText } from "@/lib/inline-edit";

type Size = "sm" | "md" | "lg" | "xl";

interface SpotlightContrastProps {
  /** Rubrik ovanför korten */
  title?: string;
  /** Tag (UPPERCASE) */
  tag?: string;
  /** Vilket kort som blir hjälte i steg 2: "right" (default) | "left" */
  hero?: "left" | "right";
  /**
   * Hur stort hjälte-kortet ska bli i förhållande till skugg-kortet i steg 2.
   * "subtle" (1.4 : 1) | "balanced" (2 : 1, default) | "dramatic" (3.5 : 1)
   */
  intensity?: "subtle" | "balanced" | "dramatic";
  titleSize?: Size;
  /**
   * Två SpotlightCard-komponenter som children.
   * Första = vänster kort, andra = höger kort.
   */
  children?: ReactNode;
}

interface SpotlightCardProps {
  /** Rubrik på kortet */
  title: string;
  /** Liten tag ovanför kortets titel (UPPERCASE) */
  tag?: string;
  /** Markdown-lista i children */
  children?: ReactNode;
}

const TITLE_SIZES: Record<Size, string> = {
  sm: "clamp(1.5rem, 3vw, 2.25rem)",
  md: "clamp(2rem, 4vw, 3rem)",
  lg: "clamp(2.75rem, 5vw, 4.25rem)",
  xl: "clamp(3.5rem, 6.5vw, 5.5rem)",
};

const INTENSITY_RATIOS: Record<NonNullable<SpotlightContrastProps["intensity"]>, [number, number]> = {
  subtle: [1, 1.4],
  balanced: [1, 2],
  dramatic: [1, 3.5],
};

function extractCards(
  children: ReactNode
): { title: string; tag?: string; items: ReactNode[] }[] {
  const cards: { title: string; tag?: string; items: ReactNode[] }[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const el = child as ReactElement<SpotlightCardProps>;
    // Hoppa över rena textnoder / strängar som kan smyga in från MDX-whitespace.
    // Vi accepterar alla React-komponenter (typeof type !== "string") — i praktiken
    // endast SpotlightCard eftersom andra komponenter inte har title/tag-props
    // vi kan läsa, men vi är defensiva:
    if (typeof el.type === "string") return;
    const title = el.props?.title;
    if (typeof title !== "string") return;
    const items: ReactNode[] = [];
    Children.forEach(el.props.children, (c) => {
      if (!isValidElement(c)) return;
      const inner = c as ReactElement<{ children?: ReactNode }>;
      if (inner.type === "ul" || inner.type === "ol") {
        Children.forEach(inner.props.children, (li) => {
          if (isValidElement(li) && (li as ReactElement).type === "li") {
            items.push((li as ReactElement<{ children?: ReactNode }>).props.children);
          }
        });
      } else if (inner.type === "li") {
        items.push(inner.props.children);
      }
    });
    cards.push({ title, tag: el.props.tag, items });
  });
  return cards;
}

/**
 * SpotlightContrast — två kontrasterande kort där det andra kortet "stjäl
 * scenen" när det avslöjas. Steg 1: kort A visas. Steg 2: kort B kommer in
 * och växer till hjälte-storlek samtidigt som kort A krymper och bleknar.
 *
 * Skapad för "Vanliga kundtjänstbotar vs en samtalstjänst"-jämförelser där hela poängen
 * är att rikta uppmärksamheten åt det ena hållet.
 *
 * <SpotlightContrast title="Två helt olika typer av samtal" hero="right">
 *   <SpotlightCard tag="VANLIGA BOTAR" title="Svarar på...">
 *   - "Var hittar jag blanketten?"
 *   - "Vilka är öppettiderna?"
 *   </SpotlightCard>
 *   <SpotlightCard tag="SAMTALSSTÖD" title="Hanterar...">
 *   - "Jag är rädd för min partner."
 *   - "Vart ska jag vända mig?"
 *   </SpotlightCard>
 * </SpotlightContrast>
 */
export function SpotlightContrast({
  title,
  tag,
  hero = "right",
  intensity = "balanced",
  titleSize = "md",
  children,
}: SpotlightContrastProps) {
  const cards = extractCards(children);
  const step = useSlideSteps(2); // 2 steg: visa A → visa B + spotlight
  const [smallRatio, bigRatio] = INTENSITY_RATIOS[intensity];

  const heroIndex = hero === "right" ? 1 : 0;
  const shadowIndex = heroIndex === 1 ? 0 : 1;

  const heroVisible = step >= 1;
  const heroSize = heroVisible ? bigRatio : smallRatio;
  const shadowSize = heroVisible ? smallRatio : bigRatio;

  // Bygg grid-template-columns
  const cols =
    hero === "right"
      ? `${shadowSize}fr ${heroSize}fr`
      : `${heroSize}fr ${shadowSize}fr`;

  return (
    <div className="slide-container">
      <div
        className="flex w-full flex-col gap-8"
        style={{ maxWidth: "var(--slide-max-width)" }}
      >
        {(tag || title) && (
          <div className="flex flex-col gap-3">
            {tag && (
              <motion.span
                className="text-xs uppercase tracking-[0.35em]"
                style={{ color: "var(--accent)" }}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <EditableText path="tag" value={tag ?? ""}>{tag}</EditableText>
              </motion.span>
            )}
            {title && (
              <motion.h2
                className="leading-[1.05]"
                style={{
                  fontSize: TITLE_SIZES[titleSize],
                  fontFamily: "var(--font-display)",
                  fontWeight: "var(--heading-weight)",
                  letterSpacing: "var(--heading-tracking)",
                  color: "var(--text)",
                }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
              >
                <EditableText
                  path="title"
                  value={title ?? ""}
                  sizeControls={[
                    { prop: "titleSize", current: titleSize, options: ["sm", "md", "lg", "xl"], label: "Titel" },
                  ]}
                >{title}</EditableText>
              </motion.h2>
            )}
          </div>
        )}

        <motion.div
          className="grid gap-5 items-stretch"
          animate={{ gridTemplateColumns: cols }}
          transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
          style={{ display: "grid" }}
        >
          {cards.map((card, i) => {
            const isHero = i === heroIndex;
            const isVisible = i === shadowIndex || heroVisible;
            const intensityActive = heroVisible && isHero;
            return (
              <AnimatePresence key={i} mode="wait">
                {isVisible && (
                  <motion.div
                    layout
                    initial={{ opacity: 0, y: 24, scale: 0.96 }}
                    animate={{
                      opacity: heroVisible && !isHero ? 0.4 : 1,
                      y: 0,
                      scale: 1,
                    }}
                    exit={{ opacity: 0, y: 12 }}
                    transition={{
                      opacity: { duration: 0.6 },
                      y: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
                      scale: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
                    }}
                    className="flex flex-col gap-4 p-7"
                    style={{
                      borderRadius: "var(--radius)",
                      border: intensityActive
                        ? "1px solid color-mix(in srgb, var(--accent) 70%, transparent)"
                        : "1px solid rgba(255,255,255,0.1)",
                      background: intensityActive
                        ? "linear-gradient(160deg, color-mix(in srgb, var(--accent) 18%, transparent), color-mix(in srgb, var(--accent) 6%, transparent))"
                        : "rgba(255,255,255,0.04)",
                      boxShadow: intensityActive
                        ? "0 30px 80px -30px color-mix(in srgb, var(--accent) 50%, transparent), 0 0 0 1px color-mix(in srgb, var(--accent) 15%, transparent) inset"
                        : "none",
                      filter: heroVisible && !isHero ? "saturate(0.6)" : "none",
                      transition:
                        "border-color 0.6s ease, background 0.6s ease, box-shadow 0.6s ease, filter 0.6s ease",
                    }}
                  >
                    {card.tag && (
                      <span
                        className="text-xs uppercase tracking-[0.3em]"
                        style={{
                          color: intensityActive
                            ? "var(--accent)"
                            : "var(--text-muted)",
                          fontWeight: 600,
                        }}
                      >
                        {card.tag}
                      </span>
                    )}
                    <h3
                      style={{
                        fontFamily: "var(--font-display)",
                        fontWeight: "var(--heading-weight)",
                        letterSpacing: "var(--heading-tracking)",
                        color: "var(--text)",
                        fontSize: intensityActive
                          ? "clamp(1.625rem, 2.6vw, 2.25rem)"
                          : "clamp(1rem, 1.6vw, 1.375rem)",
                        lineHeight: 1.1,
                        transition: "font-size 0.6s ease",
                      }}
                    >
                      {card.title}
                    </h3>
                    <ul
                      className="flex flex-col gap-2.5"
                      style={{
                        fontSize: intensityActive
                          ? "clamp(1.125rem, 1.8vw, 1.5rem)"
                          : "clamp(0.85rem, 1.1vw, 1rem)",
                        color: intensityActive
                          ? "var(--text)"
                          : "var(--text-muted)",
                        transition: "font-size 0.6s ease",
                        listStyle: "none",
                        padding: 0,
                      }}
                    >
                      {card.items.map((item, j) => (
                        <motion.li
                          key={j}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{
                            duration: 0.4,
                            delay: 0.15 + j * 0.08,
                          }}
                          className="leading-snug"
                          style={{
                            paddingLeft: intensityActive ? "1.125rem" : "0.75rem",
                            borderLeft: intensityActive
                              ? "3px solid color-mix(in srgb, var(--accent) 70%, transparent)"
                              : "1px solid color-mix(in srgb, var(--text-muted) 40%, transparent)",
                            transition: "padding-left 0.6s ease, border-left 0.6s ease",
                          }}
                        >
                          {item}
                        </motion.li>
                      ))}
                    </ul>
                  </motion.div>
                )}
              </AnimatePresence>
            );
          })}
        </motion.div>
      </div>
    </div>
  );
}

/**
 * SpotlightCard — sub-component för SpotlightContrast.
 * Används inte ensam, bara som children.
 */
export function SpotlightCard(_props: SpotlightCardProps) {
  // Renderas av SpotlightContrast — denna är bara en typad placeholder
  // så MDX kan parsa <SpotlightCard ...> korrekt.
  return null;
}
SpotlightCard.displayName = "SpotlightCard";
