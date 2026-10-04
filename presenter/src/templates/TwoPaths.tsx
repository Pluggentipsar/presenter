"use client";

import { motion } from "framer-motion";
import { Children, isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { EditableText } from "@/lib/inline-edit";
import { withAlpha } from "@/lib/gradient-presets";
import { unwrapLazy } from "@/lib/extract-text";

interface TwoPathsProps {
  /** Gemensam titel över båda kolumnerna. */
  title?: string;
  /** Rubrik för vänster kolumn. */
  leftTitle?: string;
  /** Rubrik för höger kolumn. */
  rightTitle?: string;
  /** Accent för vänster (default orange). */
  leftAccent?: string;
  /** Accent för höger (default dämpad grå — ska kännas ljuvligt trött, inte aggressiv). */
  rightAccent?: string;
  /**
   * Jämnviktat läge: båda kolumnerna lika tunga. För slides där högerkolumnen
   * är en tes, inte en trötthet. Släcker ambient-glöden och kursiven och höjer
   * radtypografin till affischstorlek. Default false = oförändrat.
   */
  balance?: boolean;
  /**
   * Vilken kolumn som bär poängen. Styr textfärg, rubrikvikt, avdelarens glöd
   * och progress-prickarna. Default "left" = oförändrat mot tidigare deck.
   */
  emphasis?: "left" | "right";
  /** Etikett ovanför vänster rubrik. Tom sträng tar bort den helt. */
  leftLabel?: string;
  /** Etikett ovanför höger rubrik. Tom sträng tar bort den helt. */
  rightLabel?: string;
  /** Bakgrund. */
  background?: string;
  /**
   * Markdown-lista. Varje rad har två delar separerade av `·`:
   *   - Vänster item · Höger item
   */
  children?: ReactNode;
}

function resolveBackground(bg: string | undefined): string {
  const fallback = "var(--slide-base, var(--bg))";
  if (!bg) return fallback;
  if (bg.startsWith("/") || bg.startsWith("http")) {
    return `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.7)), url('${bg}') center/cover no-repeat`;
  }
  return bg;
}

/** True när bakgrunden är ett foto med mörkt scrim — då måste texten alltid vara ljus. */
function hasPhotoBackground(bg: string | undefined): boolean {
  return !!bg && (bg.startsWith("/") || bg.startsWith("http"));
}

// Fasta ljusa textfärger för foto-scrim (gäller oavsett tema).
const SCRIM_TEXT = "rgba(245,246,250,0.92)";
const SCRIM_TEXT_MUTED = "rgba(245,246,250,0.6)";

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

interface PairedRow {
  left: string;
  right: string;
}

function parseRows(children: ReactNode): PairedRow[] {
  const rows: PairedRow[] = [];
  const walkLi = (li: ReactElement<{ children?: ReactNode }>) => {
    const raw = extractText(li.props.children).trim();
    const parts = raw.split(/\s*·\s*/);
    if (parts.length >= 2) {
      rows.push({ left: parts[0].trim(), right: parts.slice(1).join(" · ").trim() });
    } else {
      rows.push({ left: raw, right: "" });
    }
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
  return rows;
}

/**
 * Två kolumner sida vid sida med en glödande animerad avdelare i mitten.
 * Varje rad är ett par: vänster item och höger item, separerade med `·`.
 * Stegvis reveal via space — båda sidor kommer in parvis med stagger.
 */
export function TwoPaths({
  title,
  leftTitle = "",
  rightTitle = "",
  leftAccent = "var(--accent)",
  rightAccent = "#6A6763",
  balance = false,
  emphasis = "left",
  leftLabel = "← Väg A",
  rightLabel = "Väg B →",
  background,
  children,
}: TwoPathsProps) {
  const rows = parseRows(children);
  // Step 0 = bara titlar, step 1..N = N paired-rader revealed
  const activeStep = useSlideSteps(Math.max(rows.length, 1));

  // När bakgrunden är ett foto (med mörkt scrim) måste texten vara fast ljus —
  // annars följer den temat (mörk på ljust tema, ljus på mörkt).
  const photoBg = hasPhotoBackground(background);
  const textColor = photoBg ? SCRIM_TEXT : "var(--text)";
  const mutedColor = photoBg ? SCRIM_TEXT_MUTED : "var(--text-muted)";

  // Vilken kolumn som bär poängen. emphasis="left" (default) = exakt som förr.
  const emphRight = emphasis === "right";
  // balance väger kolumnerna lika; annars följer både färg och vikt emphasis.
  const leftText = balance ? textColor : emphRight ? mutedColor : textColor;
  const rightText = balance ? textColor : emphRight ? textColor : mutedColor;
  const leftWeight = !balance && emphRight ? 500 : 600;
  const rightWeight = balance || emphRight ? 600 : 500;
  // Kromet (glöd, avdelare, progress) måste peka mot samma kolumn som texten.
  const leadAccent = emphRight ? rightAccent : leftAccent;
  const trailAccent = emphRight ? leftAccent : rightAccent;
  // Kursiven släcks i balance-läge, och av affischteman via --display-italic.
  const displayItalic = balance ? "normal" : "var(--display-italic, italic)";
  // Radtypografin: affischstorlek i balance-läge, alltid skalad av temat.
  const rowFontSize = `calc(${
    balance ? "clamp(1.3rem, 1.9vw, 2.1rem)" : "clamp(1rem, 1.35vw, 1.4rem)"
  } * var(--display-scale, 1))`;
  const colTitleFontSize = "calc(clamp(1.4rem, 2.2vw, 2.2rem) * var(--display-scale, 1))";

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: resolveBackground(background) }}
    >
      {/* Ambient glow vid divider — rent dekorativt lager. Renderas inte alls i
          balance-läge: med en bläcksvart accent blir ellipsen en gråsmuts mitt
          på pappret, och globals nollar bara box-shadow/filter, inte en
          background-gradient. På ljusa joelsai-teman släcks den av
          .ambient-accent enligt husmönstret. */}
      {balance ? null : (
        <div
          aria-hidden
          className="ambient-accent absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse 30% 80% at 50% 50%, ${withAlpha(leadAccent, 0.07)} 0%, transparent 70%)`,
          }}
        />
      )}

      <div
        className="relative flex h-full w-full flex-col"
        style={{
          padding: "clamp(2.5rem, 4.5vw, 5rem)",
          zIndex: 2,
          gap: "clamp(1.5rem, 3vh, 3rem)",
        }}
      >
        {/* Gemensam titel */}
        {title ? (
          <motion.h2
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 500,
              fontStyle: displayItalic,
              fontSize: "clamp(1.75rem, 3.5vw, 3rem)",
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
              color: textColor,
              margin: 0,
              textAlign: "center",
              maxWidth: "30em",
              alignSelf: "center",
            }}
          >
            <EditableText path="title" value={title ?? ""}>{title}</EditableText>
          </motion.h2>
        ) : null}

        {/* Kolumn-layout */}
        <div
          className="flex-1 relative"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto 1fr",
            gap: "clamp(1.5rem, 3vw, 3.5rem)",
            alignItems: "start",
          }}
        >
          {/* Vänster kolumn */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {leftTitle ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.3 }}
                style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}
              >
                {leftLabel ? (
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "clamp(0.7rem, 0.85vw, 0.9rem)",
                      letterSpacing: "0.28em",
                      textTransform: "uppercase",
                      color: leftAccent,
                      fontWeight: 600,
                    }}
                  >
                    {leftLabel}
                  </div>
                ) : null}
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: leftWeight,
                    fontSize: colTitleFontSize,
                    lineHeight: 1.1,
                    color: leftText,
                    letterSpacing: "-0.015em",
                  }}
                >
                  <EditableText path="leftTitle" value={leftTitle ?? ""}>{leftTitle}</EditableText>
                </div>
              </motion.div>
            ) : null}
            {rows.map((row, i) => {
              const revealed = i <= activeStep;
              return (
                <motion.div
                  key={`L-${i}`}
                  initial={{ opacity: 0, x: -30, filter: "blur(6px)" }}
                  animate={
                    revealed
                      ? { opacity: 1, x: 0, filter: "blur(0px)" }
                      : { opacity: 0, x: -30, filter: "blur(6px)" }
                  }
                  transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                  style={{
                    display: "flex",
                    gap: "0.75rem",
                    alignItems: "flex-start",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "clamp(0.7rem, 0.85vw, 0.9rem)",
                      color: leftAccent,
                      fontWeight: 700,
                      letterSpacing: "0.15em",
                      flexShrink: 0,
                      marginTop: "0.25rem",
                      minWidth: "1.8rem",
                    }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-display)",
                      fontStyle: displayItalic,
                      fontSize: rowFontSize,
                      lineHeight: 1.35,
                      color: leftText,
                    }}
                  >
                    {row.left}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Divider: animerad glödande linje */}
          <div
            style={{
              position: "relative",
              width: "2px",
              minHeight: "100%",
              alignSelf: "stretch",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: photoBg
                  ? "rgba(247,241,230,0.06)"
                  : "rgba(0,0,0,0.1)",
              }}
            />
            <motion.div
              data-glow=""
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ duration: 1.5, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
              style={{
                position: "absolute",
                inset: 0,
                background: `linear-gradient(to bottom, ${withAlpha(leadAccent, 0.8)} 0%, ${withAlpha(leadAccent, 0.25)} 50%, ${withAlpha(trailAccent, 0.25)} 100%)`,
                transformOrigin: "top",
                boxShadow: `0 0 16px ${withAlpha(leadAccent, 0.38)}`,
              }}
            />
          </div>

          {/* Höger kolumn */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {rightTitle ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.45 }}
                style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}
              >
                {rightLabel ? (
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "clamp(0.7rem, 0.85vw, 0.9rem)",
                      letterSpacing: "0.28em",
                      textTransform: "uppercase",
                      color: rightAccent,
                      fontWeight: 600,
                    }}
                  >
                    {rightLabel}
                  </div>
                ) : null}
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: rightWeight,
                    fontSize: colTitleFontSize,
                    lineHeight: 1.1,
                    color: rightText,
                    letterSpacing: "-0.015em",
                  }}
                >
                  <EditableText path="rightTitle" value={rightTitle ?? ""}>{rightTitle}</EditableText>
                </div>
              </motion.div>
            ) : null}
            {rows.map((row, i) => {
              const revealed = i <= activeStep;
              return (
                <motion.div
                  key={`R-${i}`}
                  initial={{ opacity: 0, x: 30, filter: "blur(6px)" }}
                  animate={
                    revealed
                      ? { opacity: 1, x: 0, filter: "blur(0px)" }
                      : { opacity: 0, x: 30, filter: "blur(6px)" }
                  }
                  transition={{
                    duration: 0.7,
                    delay: 0.25, // höger kommer lite efter vänster, kontraststillfälle
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  style={{
                    display: "flex",
                    gap: "0.75rem",
                    alignItems: "flex-start",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "clamp(0.7rem, 0.85vw, 0.9rem)",
                      color: rightAccent,
                      fontWeight: 600,
                      letterSpacing: "0.15em",
                      flexShrink: 0,
                      marginTop: "0.25rem",
                      minWidth: "1.8rem",
                    }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: rowFontSize,
                      lineHeight: 1.35,
                      color: rightText,
                    }}
                  >
                    {row.right}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Progress-indikator längst ner */}
        <div
          style={{
            display: "flex",
            gap: "0.35rem",
            justifyContent: "center",
            marginTop: "auto",
          }}
        >
          {rows.map((_, i) => (
            <motion.div
              key={i}
              animate={{
                background:
                  i <= activeStep
                    ? leadAccent
                    : photoBg
                      ? "rgba(247,241,230,0.15)"
                      : "rgba(0,0,0,0.15)",
                width: i === activeStep ? "2rem" : "0.5rem",
              }}
              transition={{ duration: 0.4 }}
              style={{
                height: "2px",
                borderRadius: "1px",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
