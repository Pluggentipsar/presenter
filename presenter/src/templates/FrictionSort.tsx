"use client";

import { motion } from "framer-motion";
import { Children, isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";
import { EditableText } from "@/lib/inline-edit";
import { useSlideSteps } from "@/lib/slide-steps";
import { withAlpha } from "@/lib/gradient-presets";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * FrictionSort — friktion sorteras live i två högar.
 *
 * Friktionslappar flyger in från mitten en i taget (stegvis) och sorteras:
 * den meningslösa friktionen åt vänster (dämpad — delegerad till AI), den
 * meningsfulla åt höger (glödande — din att skydda). Själva sorteringen är
 * poängen — beslutet händer inför publiken.
 *
 * MDX-format — varje rad är en lapp, `sida · text`:
 *
 * ```mdx
 * <FrictionSort title="AI tar bort friktion. Du väljer vilken.">
 * - delegera · Skriva av det inspelade mötet
 * - skydda · Det svåra beslutet
 * </FrictionSort>
 * ```
 *
 * sida = "delegera" (vänster) eller "skydda" (höger). Listans ordning = den
 * ordning lapparna sorteras i.
 */

interface FrictionSortProps {
  chapter?: string;
  title?: string;
  subtitle?: string;
  leftLabel?: string;
  rightLabel?: string;
  leftCaption?: string;
  rightCaption?: string;
  accent?: string;
  background?: string;
  /** Stegvis reveal — varje steg sorterar en lapp. Default true. */
  stepped?: boolean;
  children?: ReactNode;
}

interface SortItem {
  side: "left" | "right";
  text: string;
}

/** En foto/URL-bakgrund får en mörk scrim för läsbarhet — då måste texten vara ljus oavsett tema. */
function isPhotoBackground(bg: string | undefined): boolean {
  return !!bg && (bg.startsWith("/") || bg.startsWith("http"));
}

function resolveBackground(bg: string | undefined): string {
  const fallback = "var(--slide-base, var(--bg))";
  if (!bg) return fallback;
  if (isPhotoBackground(bg)) {
    return `linear-gradient(rgba(10,9,8,0.62), rgba(10,9,8,0.78)), url('${bg}') center/cover no-repeat`;
  }
  return bg;
}

// Fasta ljusa textfärger för element som alltid är mörka (foto-scrim).
const FIXED_LIGHT = "rgba(245,246,250,0.92)";
const FIXED_LIGHT_MUTED = "rgba(245,246,250,0.6)";

function extractText(rawNode: ReactNode): string {
  const node = unwrapLazy(rawNode);
  if (node == null || node === false) return "";
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (isValidElement(node)) {
    const el = node as ReactElement<{ children?: ReactNode }>;
    const t = el.type;
    const inner = extractText(el.props.children);
    if (t === "strong") return `**${inner}**`;
    if (t === "em") return `*${inner}*`;
    return inner;
  }
  return "";
}

function normalizeSide(raw: string): "left" | "right" {
  const s = raw.trim().toLowerCase();
  if (
    s.startsWith("skydda") ||
    s.startsWith("behåll") ||
    s.startsWith("behall") ||
    s.startsWith("höger") ||
    s.startsWith("hoger") ||
    s === "r" ||
    s === "h"
  ) {
    return "right";
  }
  return "left";
}

function parseItems(children: ReactNode): SortItem[] {
  const out: SortItem[] = [];
  const walkLi = (li: ReactElement<{ children?: ReactNode }>) => {
    const raw = extractText(li.props.children).trim();
    if (!raw) return;
    const parts = raw.split(/\s*·\s*/);
    if (parts.length < 2) return;
    out.push({
      side: normalizeSide(parts[0]),
      text: parts.slice(1).join(" · ").trim(),
    });
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
  return out;
}

function renderInline(text: string, accent: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) {
      return (
        <strong key={i} style={{ color: accent, fontWeight: 700 }}>
          {p.slice(2, -2)}
        </strong>
      );
    }
    return <span key={i}>{p}</span>;
  });
}

const LEFT_TILTS = [-2.4, 1.9, -1.5, 2.2, -2, 1.4];

export function FrictionSort({
  chapter,
  title,
  subtitle,
  leftLabel = "Delegera",
  rightLabel = "Skydda",
  leftCaption,
  rightCaption,
  accent = "#b4763a",
  background,
  stepped = true,
  children,
}: FrictionSortProps) {
  const items = parseItems(children);
  const activeStep = useSlideSteps(Math.max(1, items.length));
  const visibleCount = stepped ? activeStep + 1 : items.length;
  const onPhoto = isPhotoBackground(background);
  const mutedColor = onPhoto ? FIXED_LIGHT_MUTED : "var(--text-muted)";
  const textColor = onPhoto ? FIXED_LIGHT : "var(--text)";
  // Hårlinjer/ytor: neutralt mörkt på ljus bakgrund, men ljust på foto-scrim/mörkt tema.
  const hairline = onPhoto ? "rgba(245,246,250,0.16)" : "rgba(0,0,0,0.1)";
  const faintSurface = onPhoto ? "rgba(245,246,250,0.06)" : "var(--bg-surface)";
  const faintLine = onPhoto ? "rgba(245,246,250,0.06)" : "rgba(0,0,0,0.08)";

  const withIndex = items.map((it, i) => ({ ...it, gi: i }));
  const leftItems = withIndex.filter((it) => it.side === "left");
  const rightItems = withIndex.filter((it) => it.side === "right");

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: resolveBackground(background) }}
    >
      {/* ambient glow på skydda-sidan */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 38% 62% at 78% 60%, ${withAlpha(accent, 0.13)} 0%, transparent 70%)`,
        }}
      />

      {/* chapter */}
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

      {/* hårkorsmarkör */}
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

      <div
        className="relative flex h-full w-full flex-col"
        style={{
          padding: "clamp(3rem, 5vw, 5.5rem)",
          justifyContent: "center",
          gap: "clamp(1.4rem, 3vh, 2.6rem)",
          zIndex: 2,
        }}
      >
        {/* header */}
        <div className="flex flex-col gap-2" style={{ flexShrink: 0 }}>
          {title ? (
            <motion.h2
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 600,
                fontSize: "clamp(1.9rem, 3.4vw, 3.1rem)",
                lineHeight: 1.06,
                letterSpacing: "-0.025em",
                color: textColor,
                margin: 0,
                maxWidth: "20em",
              }}
            >
              <EditableText path="title" value={title}>
                {title}
              </EditableText>
            </motion.h2>
          ) : null}
          {subtitle ? (
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              style={{
                fontFamily: "var(--font-display)",
                fontStyle: "italic",
                fontSize: "clamp(1rem, 1.25vw, 1.3rem)",
                color: mutedColor,
                margin: 0,
                lineHeight: 1.35,
                maxWidth: "34em",
              }}
            >
              <EditableText path="subtitle" value={subtitle}>
                {subtitle}
              </EditableText>
            </motion.p>
          ) : null}
        </div>

        {/* sorterings-yta */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto 1fr",
            gap: "clamp(1.2rem, 3vw, 3rem)",
          }}
        >
          <SortColumn
            variant="left"
            label={leftLabel}
            caption={leftCaption}
            labelPath="leftLabel"
            captionPath="leftCaption"
            items={leftItems}
            visibleCount={visibleCount}
            accent={accent}
            mutedColor={mutedColor}
            textColor={textColor}
            faintSurface={faintSurface}
            hairline={hairline}
          />

          {/* glödande avdelare */}
          <div style={{ position: "relative", width: "2px", alignSelf: "stretch" }}>
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: faintLine,
              }}
            />
            <motion.div
              initial={{ scaleY: 0, opacity: 0 }}
              animate={{ scaleY: 1, opacity: 1 }}
              transition={{ duration: 1.2, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
              style={{
                position: "absolute",
                inset: 0,
                background: `linear-gradient(to bottom, transparent, ${accent}, transparent)`,
                transformOrigin: "top",
                boxShadow: `0 0 16px ${withAlpha(accent, 0.4)}`,
              }}
            />
          </div>

          <SortColumn
            variant="right"
            label={rightLabel}
            caption={rightCaption}
            labelPath="rightLabel"
            captionPath="rightCaption"
            items={rightItems}
            visibleCount={visibleCount}
            accent={accent}
            mutedColor={mutedColor}
            textColor={textColor}
            faintSurface={faintSurface}
            hairline={hairline}
          />
        </div>

        {/* progress */}
        {stepped && items.length > 1 ? (
          <div
            style={{
              display: "flex",
              gap: "0.35rem",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {items.map((_, i) => (
              <motion.div
                key={i}
                animate={{
                  background: i <= activeStep ? accent : hairline,
                  width: i === activeStep ? "1.8rem" : "0.45rem",
                }}
                transition={{ duration: 0.4 }}
                style={{ height: "2px", borderRadius: "1px" }}
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function SortColumn({
  variant,
  label,
  caption,
  labelPath,
  captionPath,
  items,
  visibleCount,
  accent,
  mutedColor,
  textColor,
  faintSurface,
  hairline,
}: {
  variant: "left" | "right";
  label: string;
  caption?: string;
  labelPath: string;
  captionPath: string;
  items: { side: "left" | "right"; text: string; gi: number }[];
  visibleCount: number;
  accent: string;
  mutedColor: string;
  textColor: string;
  faintSurface: string;
  hairline: string;
}) {
  const isRight = variant === "right";
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "clamp(0.55rem, 1.2vh, 0.95rem)",
        alignItems: isRight ? "flex-start" : "flex-end",
      }}
    >
      {/* kolumn-rubrik */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.2rem",
          alignItems: isRight ? "flex-start" : "flex-end",
          textAlign: isRight ? "left" : "right",
          marginBottom: "0.3rem",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: isRight ? 700 : 600,
            fontSize: "clamp(1.3rem, 2vw, 2rem)",
            letterSpacing: "-0.015em",
            color: isRight ? accent : mutedColor,
            textShadow: isRight ? `0 0 26px ${withAlpha(accent, 0.33)}` : "none",
          }}
        >
          <EditableText path={labelPath} value={label}>
            {label}
          </EditableText>
        </div>
        {caption ? (
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "clamp(0.62rem, 0.78vw, 0.8rem)",
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: mutedColor,
            }}
          >
            <EditableText path={captionPath} value={caption}>
              {caption}
            </EditableText>
          </div>
        ) : null}
      </div>

      {/* lappar */}
      {items.map((it, idx) => {
        const revealed = it.gi < visibleCount;
        const tilt = isRight ? 0 : LEFT_TILTS[idx % LEFT_TILTS.length];
        const fromX = isRight ? -150 : 150;
        return (
          <motion.div
            key={it.gi}
            initial={{ opacity: 0, x: fromX, scale: 1.05 }}
            animate={
              revealed
                ? { opacity: 1, x: 0, scale: isRight ? 1 : 0.96, rotate: tilt }
                : { opacity: 0, x: fromX, scale: 1.05, rotate: 0 }
            }
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            style={{
              width: "100%",
              maxWidth: "22rem",
              padding:
                "clamp(0.7rem, 1.1vw, 1rem) clamp(0.95rem, 1.4vw, 1.3rem)",
              borderRadius: "0.6rem",
              background: isRight
                ? `linear-gradient(135deg, ${withAlpha(accent, 0.15)}, ${withAlpha(accent, 0.07)})`
                : faintSurface,
              border: isRight
                ? `1px solid ${withAlpha(accent, 0.6)}`
                : `1px solid ${hairline}`,
              boxShadow: isRight
                ? `0 12px 34px -10px ${withAlpha(accent, 0.33)}, inset 0 1px 0 rgba(255,255,255,0.08)`
                : "none",
              fontFamily: "var(--font-display)",
              fontSize: "clamp(0.92rem, 1.18vw, 1.18rem)",
              lineHeight: 1.32,
              color: isRight ? textColor : mutedColor,
              fontWeight: isRight ? 600 : 400,
            }}
          >
            {renderInline(it.text, accent)}
          </motion.div>
        );
      })}
    </div>
  );
}
