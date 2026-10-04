"use client";

import { Children, isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { EditableText } from "@/lib/inline-edit";
import { useSlideSteps } from "@/lib/slide-steps";
import { withAlpha } from "@/lib/gradient-presets";
import { glassCardStyle, SpecularHighlight } from "./_decorations/GlassDecorations";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * AcronymInsertion ★ — den kända modellen först, tillägget sen.
 *
 * Steg 1 visar akronymen som publiken redan kan. Steg 2 skjuter in den nya
 * bokstaven på sin plats, och de efterföljande bokstäverna glider åt sidan
 * för att ge plats. Rörelsen ÄR argumentet: det här är inte en ny modell att
 * lära sig, det är den gamla med en bit tillagd.
 *
 * Byggd för ECPA, där lärare redan kan EPA. En vanlig lista hade visat fyra
 * likvärdiga punkter och tappat just det som är nytt.
 *
 * Bokstäverna sätts stort med flit — de bär från bortre raden i salen även
 * när beskrivningarna inte gör det.
 *
 * MDX-format — `bokstav · ord · beskrivning` plus `ny` på den som skjuts in:
 * ```mdx
 * <AcronymInsertion kicker="§ ECPA" title="EPA plus en designad samtalspartner">
 * - E · Enskilt · skriv ner din egen position och varför
 * - C · Chattbot · möt en sokratisk bot som ställer motfrågor · ny
 * - P · Par · jämför hur dina tankar förändrats
 * - A · Alla · klassen kartlägger spektrumet av positioner
 * </AcronymInsertion>
 * ```
 */

interface AcronymInsertionProps {
  kicker?: string;
  chapter?: string;
  title?: string;
  /** Den konkreta frågan eller uppgiften. */
  subtitle?: string;
  /** Landningsrad på sista steget. Stödjer **fetstil**. */
  payoff?: string;
  /** Etikett på den nya biten. Default "Ny". */
  newLabel?: string;
  accent?: string;
  children?: ReactNode;
}

interface Letter {
  letter: string;
  word: string;
  body: string;
  isNew: boolean;
}

function extractText(rawNode: ReactNode): string {
  const node = unwrapLazy(rawNode);
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (isValidElement(node)) {
    return extractText((node as ReactElement<{ children?: ReactNode }>).props.children);
  }
  return "";
}

function parseLetters(children: ReactNode): Letter[] {
  const out: Letter[] = [];
  const add = (raw: string) => {
    const p = raw.split("·").map((s) => s.trim());
    if (!p[0]) return;
    out.push({
      letter: p[0].replace(/\*\*/g, ""),
      word: p[1] ?? "",
      body: p[2] ?? "",
      isNew: /^ny$/i.test(p[3] ?? ""),
    });
  };

  if (typeof children === "string") {
    for (const line of children.split("\n")) {
      const m = /^\s*-\s+(.*)$/.exec(line);
      if (m) add(m[1]);
    }
    return out;
  }

  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const el = child as ReactElement<{ children?: ReactNode }>;
    if (el.type === "ul" || el.type === "ol") {
      Children.forEach(el.props.children, (li) => {
        if (isValidElement(li) && (li as ReactElement).type === "li") {
          add(extractText((li as ReactElement<{ children?: ReactNode }>).props.children).trim());
        }
      });
    } else if (el.type === "li") {
      add(extractText(el.props.children).trim());
    }
  });
  return out;
}

export function AcronymInsertion({
  kicker,
  chapter,
  title,
  subtitle,
  payoff,
  newLabel = "Ny",
  accent = "var(--accent)",
  children,
}: AcronymInsertionProps) {
  const all = parseLetters(children);
  const step = useSlideSteps(2);
  const inserted = step >= 1;

  if (all.length === 0) return null;

  // Steg 0 visar bara den kända modellen. Framer Motions layout-animation
  // sköter förskjutningen när den nya biten kommer in i listan.
  const shown = inserted ? all : all.filter((l) => !l.isNew);
  const known = all.filter((l) => !l.isNew).map((l) => l.letter).join("");
  const full = all.map((l) => l.letter).join("");

  return (
    <div
      className="relative flex h-full w-full flex-col overflow-hidden"
      style={{
        background: "var(--slide-base, var(--bg))",
        padding: "clamp(2rem, 4vh, 3.4rem) clamp(2.5rem, 5vw, 5rem)",
      }}
    >
      {/* Ljuskällor bakom glaset. Utan något att bryta mot ser en frostad
          panel bara ut som en grå ruta — det är refraktionen som gör den
          till glas. Hålls svag så projektorn inte tappar den. */}
      <div className="ambient-accent"
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
          background: `
            radial-gradient(60% 70% at 18% 22%, ${withAlpha(accent, 0.13)} 0%, transparent 62%),
            radial-gradient(52% 62% at 82% 78%, ${withAlpha(accent, 0.09)} 0%, transparent 58%)
          `,
        }}
      />

      {/* Allt innehåll ligger över ljuskällorna. Utan egen stackingkontext
          skulle det absolutpositionerade lagret måla över texten. */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          flex: 1,
          minHeight: 0,
        }}
      >
      {kicker || chapter ? (
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "var(--room-caption, clamp(0.72rem, 0.95vw, 0.95rem))",
            letterSpacing: "0.3em",
            textTransform: "uppercase",
            color: "var(--text-muted)",
          }}
        >
          <EditableText path={kicker ? "kicker" : "chapter"} value={kicker ?? chapter}>
            {kicker ?? chapter}
          </EditableText>
        </div>
      ) : null}

      {title ? (
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: "var(--heading-weight)",
            fontSize: "clamp(1.6rem, 2.8vw, 2.8rem)",
            letterSpacing: "var(--heading-tracking)",
            lineHeight: 1.1,
            color: "var(--text)",
            margin: "clamp(0.5rem, 1.2vh, 0.9rem) 0 0",
            maxWidth: "28ch",
          }}
        >
          <EditableText path="title" value={title}>
            {title}
          </EditableText>
        </h2>
      ) : null}

      {subtitle ? (
        <p
          style={{
            fontFamily: "var(--font-body)",
            fontSize: "var(--room-body, clamp(1rem, 1.45vw, 1.35rem))",
            lineHeight: 1.4,
            color: "var(--text-muted)",
            margin: "clamp(0.4rem, 1vh, 0.7rem) 0 0",
            maxWidth: "52ch",
          }}
        >
          <EditableText path="subtitle" value={subtitle}>
            {subtitle}
          </EditableText>
        </p>
      ) : null}

      {/* Akronymen i klartext — vad den var, vad den blir */}
      <div
        style={{
          marginTop: "clamp(0.9rem, 2vh, 1.5rem)",
          fontFamily: "var(--font-mono)",
          fontSize: "var(--room-caption, clamp(0.68rem, 0.9vw, 0.86rem))",
          letterSpacing: "0.26em",
          textTransform: "uppercase",
          color: "var(--text-muted)",
          display: "flex",
          alignItems: "center",
          gap: "0.7rem",
        }}
      >
        <span style={{ textDecoration: inserted ? "line-through" : "none", opacity: inserted ? 0.5 : 1 }}>
          {known}
        </span>
        <AnimatePresence>
          {inserted ? (
            <motion.span
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
              style={{ color: accent, fontWeight: 700 }}
            >
              → {full}
            </motion.span>
          ) : null}
        </AnimatePresence>
      </div>

      {/* Bokstäverna */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          marginTop: "clamp(0.6rem, 1.6vh, 1.2rem)",
        }}
      >
        <div
          style={{
            display: "flex",
            width: "100%",
            gap: "clamp(0.8rem, 2vw, 2.2rem)",
            alignItems: "stretch",
          }}
        >
          <AnimatePresence mode="popLayout" initial={false}>
            {shown.map((l) => (
              <motion.div data-card=""
                key={l.letter + l.word}
                layout
                // Ingen scale här. Framer Motions layout-animation körs själv
                // med transforms, och en samtidig scaleY squashar texten inuti
                // kortet medan grannarna glider undan. Kortet materialiseras i
                // stället ur oskärpa — vilket ligger närmare glaset ändå.
                initial={l.isNew ? { opacity: 0, y: -34, filter: "blur(12px)" } : false}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -24, filter: "blur(10px)" }}
                transition={{
                  duration: 0.6,
                  ease: [0.22, 1, 0.36, 1],
                  layout: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
                }}
                style={{
                  ...glassCardStyle({
                    radius: "1.125rem",
                    blur: l.isNew ? 30 : 20,
                    padding: "clamp(0.9rem, 1.9vw, 1.5rem)",
                  }),
                  flex: 1,
                  minWidth: 0,
                  // Den nya biten lyfts ur raden: starkare accentkant och en
                  // glöd under, så den läses som tillagd även när animationen
                  // redan har spelat klart.
                  ...(l.isNew
                    ? {
                        borderColor: withAlpha(accent, 0.55),
                        boxShadow: `var(--glass-card-shadow), 0 18px 50px -22px ${withAlpha(accent, 0.75)}`,
                      }
                    : null),
                }}
              >
                {/* Ljusbrytningen i glaset — bara på den nya, annars konkurrerar
                    alla fyra korten om blicken. */}
                {l.isNew ? <SpecularHighlight intensity={0.22} /> : null}

                {l.isNew ? (
                  <span data-tag=""
                    style={{
                      position: "relative",
                      zIndex: 1,
                      display: "inline-block",
                      marginBottom: "clamp(0.3rem, 0.8vh, 0.5rem)",
                      padding: "0.16rem 0.5rem",
                      borderRadius: "999px",
                      border: `1px solid ${withAlpha(accent, 0.45)}`,
                      background: withAlpha(accent, 0.12),
                      fontFamily: "var(--font-mono)",
                      fontSize: "var(--room-caption, clamp(0.55rem, 0.72vw, 0.7rem))",
                      letterSpacing: "0.24em",
                      textTransform: "uppercase",
                      color: accent,
                    }}
                  >
                    {newLabel}
                  </span>
                ) : null}

                <div
                  style={{
                    position: "relative",
                    zIndex: 1,
                    fontFamily: "var(--font-display)",
                    fontWeight: 800,
                    fontSize: "clamp(3rem, 6.4vw, 6.4rem)",
                    lineHeight: 0.9,
                    letterSpacing: "-0.04em",
                    color: l.isNew ? accent : "var(--text)",
                    textShadow: l.isNew ? `0 0 60px ${withAlpha(accent, 0.35)}` : "none",
                  }}
                >
                  {l.letter}
                </div>

                <div
                  style={{
                    position: "relative",
                    zIndex: 1,
                    fontFamily: "var(--font-display)",
                    fontWeight: 600,
                    fontSize: "var(--room-body, clamp(1.05rem, 1.75vw, 1.65rem))",
                    lineHeight: 1.15,
                    color: "var(--text)",
                    margin: "clamp(0.4rem, 1vh, 0.7rem) 0 clamp(0.3rem, 0.7vh, 0.5rem)",
                  }}
                >
                  {l.word}
                </div>

                <div
                  style={{
                    position: "relative",
                    zIndex: 1,
                    fontFamily: "var(--font-body)",
                    // Se LessonArc: beskrivningen är innehållet och måste bära
                    // till bortre raden, inte bara till första bänkraden.
                    fontSize: "var(--room-body, clamp(0.95rem, 1.55vw, 1.45rem))",
                    lineHeight: 1.38,
                    color: "var(--text-muted)",
                  }}
                >
                  {l.body}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {payoff ? (
        <motion.div
          initial={false}
          animate={{ opacity: inserted ? 1 : 0, y: inserted ? 0 : 10 }}
          transition={{ duration: 0.5, delay: inserted ? 0.4 : 0, ease: [0.22, 1, 0.36, 1] }}
          style={{
            marginTop: "clamp(0.8rem, 2vh, 1.4rem)",
            fontFamily: "var(--font-display)",
            fontSize: "var(--room-body, clamp(1.15rem, 1.9vw, 1.85rem))",
            lineHeight: 1.3,
            color: "var(--text)",
            maxWidth: "48ch",
          }}
          dangerouslySetInnerHTML={{
            __html: payoff.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>"),
          }}
        />
      ) : null}
      </div>
    </div>
  );
}
