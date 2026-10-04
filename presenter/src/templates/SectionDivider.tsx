"use client";

import { motion } from "framer-motion";
import { Children, isValidElement, useEffect, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import { EditableText } from "@/lib/inline-edit";
import { useSlideSteps } from "@/lib/slide-steps";
import { unwrapLazy } from "@/lib/extract-text";

type Size = "sm" | "md" | "lg" | "xl";

interface SectionDividerProps {
  /** Avsnittsnummer, tex "01" eller "Del 2" */
  number?: string;
  /** Titel */
  title: string;
  /** Undertitel */
  subtitle?: string;
  /**
   * Titeln byts mot denna på NÄSTA klick — kapitlet omprövar sin egen rubrik
   * ("Rivalen" → "Eller partnern?"). Utan propen registreras inga steg och
   * dividern beter sig exakt som förut.
   */
  titleReveal?: string;
  /** Förväntad tid för avsnittet */
  duration?: string;
  /** Variant - påverkar layout */
  variant?: "centered" | "left" | "hero";
  /** Storlek på titeln. Default md. */
  titleSize?: Size;
  /** Storlek på undertiteln. Default md. */
  subtitleSize?: Size;
  /** Left-aligned hero with room for a photograph on the right. */
  photoLayout?: boolean;
  /**
   * Om children innehåller en markdown-lista (`- term`), typas termerna
   * fram en åt gången under titel/subtitle, fadar sedan till semi-
   * transparent. Används t.ex. på "Flödet"-akt-dividern för att visa
   * algoritm-namnen som arbetar i flödet.
   */
  cascadeSpeed?: number;
  cascadeGap?: number;
  cascadeDoneOpacity?: number;
  cascadeColumns?: number;
  children?: ReactNode;
}

function extractText(rawNode: ReactNode): string {
  const node = unwrapLazy(rawNode);
  if (node == null || node === false) return "";
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (isValidElement(node)) {
    const el = node as ReactElement<{ children?: ReactNode }>;
    return extractText(el.props.children);
  }
  return "";
}

function parseCascadeTerms(children: ReactNode): string[] {
  const out: string[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const el = child as ReactElement<{ children?: ReactNode }>;
    const t = el.type;
    if (t === "ul" || t === "ol") {
      Children.forEach(el.props.children, (li) => {
        if (isValidElement(li) && (li as ReactElement).type === "li") {
          const text = extractText(
            (li as ReactElement<{ children?: ReactNode }>).props.children,
          ).trim();
          if (text) out.push(text);
        }
      });
    }
  });
  return out;
}

function CascadeBlock({
  terms,
  typingSpeed,
  termGap,
  doneOpacity,
  columns,
}: {
  terms: string[];
  typingSpeed: number;
  termGap: number;
  doneOpacity: number;
  columns: number;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentTyped, setCurrentTyped] = useState(0);
  const finished = terms.length > 0 && currentIndex >= terms.length;

  useEffect(() => {
    if (finished) return;
    const term = terms[currentIndex];
    if (!term) return;
    if (currentTyped < term.length) {
      const t = setTimeout(() => setCurrentTyped((n) => n + 1), typingSpeed);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      setCurrentIndex((i) => i + 1);
      setCurrentTyped(0);
    }, termGap);
    return () => clearTimeout(t);
  }, [currentIndex, currentTyped, terms, finished, typingSpeed, termGap]);

  return (
    <div
      style={{
        width: "100%",
        display: "grid",
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        gap: "clamp(0.4rem, 0.8vh, 0.8rem) clamp(1.25rem, 2vw, 2rem)",
        alignContent: "start",
        marginTop: "clamp(1rem, 2vh, 1.75rem)",
      }}
    >
      {terms.map((term, i) => {
        const isCurrent = i === currentIndex && !finished;
        const isDone = i < currentIndex;
        const isFuture = i > currentIndex;
        const opacity = isFuture ? 0 : isDone ? doneOpacity : 1;
        const displayed = isCurrent ? term.substring(0, currentTyped) : term;
        const hiddenTail = isCurrent ? term.substring(currentTyped) : "";

        return (
          <motion.div
            key={i}
            initial={false}
            animate={{ opacity }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "clamp(0.9rem, 1.15vw, 1.25rem)",
              lineHeight: 1.3,
              color: "var(--text)",
              letterSpacing: "-0.005em",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {displayed}
            {isCurrent && currentTyped < term.length ? (
              <span
                aria-hidden
                style={{
                  display: "inline-block",
                  width: "0.55ch",
                  marginLeft: "0.05ch",
                  color: "var(--accent)",
                  animation: "section-divider-cascade-blink 1s steps(1) infinite",
                }}
              >
                ▍
              </span>
            ) : null}
            {hiddenTail ? (
              <span style={{ visibility: "hidden" }}>{hiddenTail}</span>
            ) : null}
          </motion.div>
        );
      })}
      <style>{`
        @keyframes section-divider-cascade-blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}

const TITLE_SIZES: Record<Size, string> = {
  sm: "clamp(1.75rem, 4vw, 3rem)",
  md: "clamp(2.5rem, 6vw, 5rem)",
  lg: "clamp(3.5rem, 8vw, 6.5rem)",
  xl: "clamp(4.5rem, 10vw, 8rem)",
};

const SUBTITLE_SIZES: Record<Size, string> = {
  sm: "clamp(0.95rem, 1.8vw, 1.375rem)",
  md: "clamp(1.25rem, 2.5vw, 1.875rem)",
  lg: "clamp(1.75rem, 3.5vw, 2.5rem)",
  xl: "clamp(2.25rem, 4.5vw, 3.25rem)",
};

/**
 * Avsnittsövergång i en lång presentation. Kommer mellan huvuddelar.
 *
 * <SectionDivider
 *   number="02"
 *   title="Möjligheterna"
 *   subtitle="Vad kan AI faktiskt göra i klassrummet?"
 *   duration="30 min"
 * />
 */
export function SectionDivider({
  number,
  title,
  subtitle,
  titleReveal,
  duration,
  variant = "centered",
  titleSize = "md",
  subtitleSize = "md",
  photoLayout = false,
  cascadeSpeed = 28,
  cascadeGap = 140,
  cascadeDoneOpacity = 0.32,
  cascadeColumns = 3,
  children,
}: SectionDividerProps) {
  // Utan titleReveal registreras noll steg — befintliga dividers är opåverkade.
  const titleStep = useSlideSteps(titleReveal ? 2 : 0);
  const shownTitle = titleReveal && titleStep >= 1 ? titleReveal : title;
  const titleFontSize = `calc(${TITLE_SIZES[titleSize]} * var(--display-scale, 1))`;
  const subtitleFontSize = SUBTITLE_SIZES[subtitleSize];
  const cascadeTerms = parseCascadeTerms(children);
  const hasCascade = cascadeTerms.length > 0;
  const renderChildren = hasCascade ? (
    <CascadeBlock
      terms={cascadeTerms}
      typingSpeed={cascadeSpeed}
      termGap={cascadeGap}
      doneOpacity={cascadeDoneOpacity}
      columns={cascadeColumns}
    />
  ) : (
    children
  );
  if (variant === "hero") {
    return (
      <div className="slide-container" style={photoLayout ? { height: "100%", justifyContent: "flex-start" } : undefined}>
        <div
          className="flex w-full flex-col gap-10 text-center"
          style={{ maxWidth: photoLayout ? "58%" : "var(--slide-max-width)", textAlign: photoLayout ? "left" : undefined,
            gap: photoLayout ? "clamp(1rem, 3vh, 2rem)" : undefined }}
        >
          {number && (
            <motion.div
              className="text-[clamp(4rem,10vw,8rem)] font-black leading-none tracking-tight text-accent"
              style={{
                fontFamily: "var(--font-display)",
                textShadow: "0 0 40px var(--accent-glow)",
                fontSize: photoLayout ? "clamp(3rem, 7vw, 6rem)" : undefined,
              }}
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            >
              {number}
            </motion.div>
          )}
          <motion.h1
            className="leading-tight"
            style={{
              fontSize: titleFontSize,
              fontFamily: "var(--font-display)",
              fontWeight: "var(--heading-weight)",
              letterSpacing: "var(--heading-tracking)",
            }}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.25 }}
          >
            <EditableText path="title" value={title ?? ""}>
              {/* key gör att titelbytet crossfade:ar i stället för att hoppa */}
              <motion.span
                key={shownTitle}
                initial={titleReveal ? { opacity: 0, y: 10 } : false}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                style={{ display: "inline-block" }}
              >
                {shownTitle}
              </motion.span>
            </EditableText>
          </motion.h1>
          {subtitle && (
            <motion.p
              className="mx-auto max-w-3xl leading-snug text-text-muted"
              style={{ fontSize: subtitleFontSize, marginInline: photoLayout ? 0 : undefined }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.45 }}
            >
              <EditableText path="subtitle" value={subtitle ?? ""}>{subtitle}</EditableText>
            </motion.p>
          )}
          {duration && (
            <motion.div
              className="mx-auto text-xs uppercase tracking-[0.3em] text-text-muted"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.65 }}
            >
              {duration}
            </motion.div>
          )}
          {renderChildren}
        </div>
      </div>
    );
  }

  if (variant === "left") {
    return (
      <div className="slide-container">
        <div
          className="flex w-full flex-col items-start gap-6"
          style={{ maxWidth: "var(--slide-max-width)" }}
        >
          <motion.div
            className="h-1 w-24 bg-accent"
            style={{ boxShadow: "0 0 12px var(--accent-glow)" }}
            initial={{ scaleX: 0, originX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.6 }}
          />
          {number && (
            <motion.div
              className="text-xs uppercase tracking-[0.3em] text-accent"
              style={{ fontWeight: 600 }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              {number}
            </motion.div>
          )}
          <motion.h1
            className="leading-[1.02]"
            style={{
              fontSize: titleFontSize,
              fontFamily: "var(--font-display)",
              fontWeight: "var(--heading-weight)",
              letterSpacing: "var(--heading-tracking)",
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <EditableText path="title" value={title ?? ""}>
              {/* key gör att titelbytet crossfade:ar i stället för att hoppa */}
              <motion.span
                key={shownTitle}
                initial={titleReveal ? { opacity: 0, y: 10 } : false}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                style={{ display: "inline-block" }}
              >
                {shownTitle}
              </motion.span>
            </EditableText>
          </motion.h1>
          {subtitle && (
            <motion.p
              className="max-w-3xl leading-snug text-text-muted"
              style={{ fontSize: subtitleFontSize }}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
            >
              <EditableText path="subtitle" value={subtitle ?? ""}>{subtitle}</EditableText>
            </motion.p>
          )}
          {duration && (
            <motion.div
              className="mt-4 text-xs uppercase tracking-[0.3em] text-text-muted"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
            >
              {duration}
            </motion.div>
          )}
          {renderChildren}
        </div>
      </div>
    );
  }

  // Default: centered
  return (
    <div className="slide-container">
      <div className="flex w-full flex-col items-center gap-8 text-center">
        {number && (
          <motion.div
            className="flex items-center gap-4 text-sm uppercase tracking-[0.35em] text-accent"
            style={{ fontWeight: 600 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <span className="h-px w-8 bg-accent" />
            <span>{number}</span>
            <span className="h-px w-8 bg-accent" />
          </motion.div>
        )}
        <motion.h1
          className="leading-tight"
          style={{
            fontSize: titleFontSize,
            fontFamily: "var(--font-display)",
            fontWeight: "var(--heading-weight)",
            letterSpacing: "var(--heading-tracking)",
          }}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
        >
          {title}
        </motion.h1>
        {subtitle && (
          <motion.p
            className="max-w-2xl leading-snug text-text-muted"
            style={{ fontSize: subtitleFontSize }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            {subtitle}
          </motion.p>
        )}
        {duration && (
          <motion.div
            className="text-xs uppercase tracking-[0.3em] text-text-muted"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            {duration}
          </motion.div>
        )}
        {renderChildren}
      </div>
    </div>
  );
}
